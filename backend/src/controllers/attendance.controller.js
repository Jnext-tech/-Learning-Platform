import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertCourseOwnership } from "../services/access.service.js";
import { finalizeAttendanceForRoom } from "../services/attendance.service.js";

// Student: their own attendance across all rooms. Never another student's.
export const myAttendance = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*, room:room_id(id, name, start_date, course:course_id(name))")
    .eq("student_id", req.profile.id)
    .order("finalized_at", { ascending: false });

  if (error) throw new ApiError(500, error.message);
  res.json({ attendance: data });
});

// Teacher (own room) or Manager: attendance for a specific room.
export const attendanceForRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("course_id")
    .eq("id", roomId)
    .single();
  if (!room) throw new ApiError(404, "Room not found");
  await assertCourseOwnership(req.profile, room.course_id);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*, student:student_id(id, full_name, email)")
    .eq("room_id", roomId);

  if (error) throw new ApiError(500, error.message);
  res.json({ attendance: data });
});

// Manager: attendance across a whole course, or platform-wide if no courseId.
export const attendanceOverview = asyncHandler(async (req, res) => {
  const { courseId } = req.query;

  let roomIds = null;
  if (courseId) {
    const { data: rooms } = await supabaseAdmin.from("rooms").select("id").eq("course_id", courseId);
    roomIds = (rooms || []).map((r) => r.id);
  }

  let query = supabaseAdmin
    .from("attendance")
    .select("*, student:student_id(full_name), room:room_id(name, course_id)");

  if (roomIds) query = query.in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  res.json({ attendance: data });
});

// Manually trigger finalization (also triggered automatically by endRoom).
export const finalizeRoomAttendance = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("course_id")
    .eq("id", roomId)
    .single();
  if (!room) throw new ApiError(404, "Room not found");
  await assertCourseOwnership(req.profile, room.course_id);

  const summary = await finalizeAttendanceForRoom(roomId);
  res.json({ summary });
});
