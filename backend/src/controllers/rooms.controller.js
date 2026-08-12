import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertCourseOwnership, assertRoomAccess } from "../services/access.service.js";
import { finalizeAttendanceForRoom } from "../services/attendance.service.js";

export const listRooms = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  let query = supabaseAdmin
    .from("rooms")
    .select("*, course:course_id(id, name, teacher_id)")
    .order("start_date", { ascending: true });

  if (courseId) query = query.eq("course_id", courseId);

  const { data: allRooms, error } = await query;
  if (error) throw new ApiError(500, error.message);

  // Filter to only rooms this user is actually allowed to see.
  let visible = allRooms;
  if (req.profile.role === "teacher") {
    visible = allRooms.filter((r) => r.course?.teacher_id === req.profile.id);
  } else if (req.profile.role === "student") {
    const { data: regs } = await supabaseAdmin
      .from("course_registrations")
      .select("course_id")
      .eq("student_id", req.profile.id)
      .eq("status", "active");
    const registeredCourseIds = new Set((regs || []).map((r) => r.course_id));
    visible = allRooms.filter((r) => registeredCourseIds.has(r.course_id));
  }

  res.json({ rooms: visible });
});

export const getRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertRoomAccess(req.profile, id);

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*, course:course_id(id, name, teacher:teacher_id(full_name))")
    .eq("id", id)
    .single();

  if (error || !data) throw new ApiError(404, "Room not found");
  res.json({ room: data });
});

// Only Manager or the owning Teacher may create a room (route middleware
// restricts role; here we additionally verify course ownership for teachers).
export const createRoom = asyncHandler(async (req, res) => {
  const { courseId, name, description, startDate, startTime, endTime } = req.body;
  if (!courseId || !name || !startDate || !startTime || !endTime) {
    throw new ApiError(400, "courseId, name, startDate, startTime and endTime are required");
  }

  await assertCourseOwnership(req.profile, courseId);

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      course_id: courseId,
      created_by: req.profile.id,
      name,
      description,
      start_date: startDate,
      start_time: startTime,
      end_time: endTime,
    })
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.status(201).json({ room: data });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: room } = await supabaseAdmin.from("rooms").select("course_id").eq("id", id).single();
  if (!room) throw new ApiError(404, "Room not found");
  await assertCourseOwnership(req.profile, room.course_id);

  const { name, description, startDate, startTime, endTime, status } = req.body;
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update({
      name,
      description,
      start_date: startDate,
      start_time: startTime,
      end_time: endTime,
      status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.json({ room: data });
});

// Explicit "verify I can enter this room" check the frontend calls before
// opening the room UI / socket connection. Backend is the source of truth;
// the React UI must never rely solely on hiding a link.
export const checkRoomAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertRoomAccess(req.profile, id);
  res.json({ allowed: true });
});

// Manager or owning Teacher: end the session and auto-finalize attendance.
export const endRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: room } = await supabaseAdmin.from("rooms").select("course_id").eq("id", id).single();
  if (!room) throw new ApiError(404, "Room not found");
  await assertCourseOwnership(req.profile, room.course_id);

  const summary = await finalizeAttendanceForRoom(id);
  res.json({ message: "Room ended, attendance finalized", summary });
});
