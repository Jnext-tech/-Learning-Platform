import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertCourseOwnership } from "../services/access.service.js";

// Teacher (own room) or Manager: full JOIN/LEAVE history for a room.
export const activityForRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("course_id")
    .eq("id", roomId)
    .single();
  if (!room) throw new ApiError(404, "Room not found");
  await assertCourseOwnership(req.profile, room.course_id);

  const { data, error } = await supabaseAdmin
    .from("room_activity_logs")
    .select("*, user:user_id(full_name, role)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw new ApiError(500, error.message);
  res.json({ logs: data });
});
