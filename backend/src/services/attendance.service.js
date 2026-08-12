import { supabaseAdmin } from "../config/supabase.js";

/**
 * Records a JOIN event for a student entering a room.
 *  - Always inserts a new row into room_activity_logs.
 *  - Upserts a SINGLE attendance row per (student, room): first join sets
 *    first_joined_at and marks PRESENT; subsequent re-joins do NOT create
 *    a second attendance record (unique constraint student_id+room_id).
 */
export async function recordJoin({ roomId, userId }) {
  await supabaseAdmin.from("room_activity_logs").insert({
    room_id: roomId,
    user_id: userId,
    event_type: "JOIN",
  });

  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("id")
    .eq("room_id", roomId)
    .eq("student_id", userId)
    .maybeSingle();

  if (existing) {
    // Already has an attendance record for this room — just make sure it's PRESENT.
    await supabaseAdmin
      .from("attendance")
      .update({ status: "PRESENT" })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("attendance").insert({
      room_id: roomId,
      student_id: userId,
      status: "PRESENT",
      first_joined_at: new Date().toISOString(),
    });
  }
}

/**
 * Records a LEAVE event. Updates last_left_at on the existing attendance
 * record but never removes/downgrades it — leaving does not undo PRESENT.
 */
export async function recordLeave({ roomId, userId }) {
  await supabaseAdmin.from("room_activity_logs").insert({
    room_id: roomId,
    user_id: userId,
    event_type: "LEAVE",
  });

  await supabaseAdmin
    .from("attendance")
    .update({ last_left_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("student_id", userId);
}

/**
 * Finalizes attendance for a room/session:
 *  1. Fetch all students actively registered for the room's course.
 *  2. Any registered student with no attendance row yet is marked ABSENT.
 *  3. Marks the room as 'ended'.
 * Safe to call multiple times (idempotent for students already recorded).
 */
export async function finalizeAttendanceForRoom(roomId) {
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("id, course_id, status")
    .eq("id", roomId)
    .single();

  if (roomError || !room) throw new Error("Room not found");

  const { data: registrations } = await supabaseAdmin
    .from("course_registrations")
    .select("student_id")
    .eq("course_id", room.course_id)
    .eq("status", "active");

  const { data: existingAttendance } = await supabaseAdmin
    .from("attendance")
    .select("student_id")
    .eq("room_id", roomId);

  const alreadyRecorded = new Set((existingAttendance || []).map((a) => a.student_id));

  const absentRows = (registrations || [])
    .filter((r) => !alreadyRecorded.has(r.student_id))
    .map((r) => ({
      room_id: roomId,
      student_id: r.student_id,
      status: "ABSENT",
      finalized_at: new Date().toISOString(),
    }));

  if (absentRows.length > 0) {
    await supabaseAdmin.from("attendance").insert(absentRows);
  }

  // Stamp finalized_at on students who did attend too, for completeness.
  await supabaseAdmin
    .from("attendance")
    .update({ finalized_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .is("finalized_at", null);

  await supabaseAdmin.from("rooms").update({ status: "ended" }).eq("id", roomId);

  return {
    totalRegistered: registrations?.length || 0,
    present: alreadyRecorded.size,
    absent: absentRows.length,
  };
}
