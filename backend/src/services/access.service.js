import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";

/** Throws if `profile` (a teacher) does not own `courseId`. Managers always pass. */
export async function assertCourseOwnership(profile, courseId) {
  if (profile.role === "manager") return;

  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .select("id, teacher_id")
    .eq("id", courseId)
    .single();

  if (error || !course) throw new ApiError(404, "Course not found");
  if (profile.role !== "teacher" || course.teacher_id !== profile.id) {
    throw new ApiError(403, "You do not own this course");
  }
}

/**
 * Central room access rule, mirrors the SQL `is_room_accessible` function:
 *  - manager: always allowed
 *  - teacher: allowed if they own the room's course
 *  - student: allowed if registered (active) for the room's course
 */
export async function assertRoomAccess(profile, roomId) {
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("id, course_id, courses:course_id(teacher_id)")
    .eq("id", roomId)
    .single();

  if (error || !room) throw new ApiError(404, "Room not found");

  if (profile.role === "manager") return room;

  if (profile.role === "teacher") {
    if (room.courses?.teacher_id === profile.id) return room;
    throw new ApiError(403, "This room does not belong to one of your courses");
  }

  if (profile.role === "student") {
    const { data: registration } = await supabaseAdmin
      .from("course_registrations")
      .select("id")
      .eq("student_id", profile.id)
      .eq("course_id", room.course_id)
      .eq("status", "active")
      .maybeSingle();

    if (registration) return room;
    throw new ApiError(403, "You are not registered for this room's course");
  }

  throw new ApiError(403, "Access denied");
}

export async function isRoomAccessible(profile, roomId) {
  try {
    await assertRoomAccess(profile, roomId);
    return true;
  } catch {
    return false;
  }
}
