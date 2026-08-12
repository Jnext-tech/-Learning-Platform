import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertRoomAccess } from "../services/access.service.js";

// Load message history for a room (paginated, oldest -> newest).
export const listMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { before, limit = 50 } = req.query;
  await assertRoomAccess(req.profile, roomId);

  let query = supabaseAdmin
    .from("messages")
    .select("*, sender:sender_id(id, full_name, role)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);

  res.json({ messages: (data || []).reverse() });
});

// Send a message. Insert goes through the service role after our own
// access check; Supabase Realtime (enabled on the `messages` table) then
// pushes the new row to every subscribed client in that room, including
// the sender, so the UI only needs one source of truth.
export const sendMessage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw new ApiError(400, "content is required");

  await assertRoomAccess(req.profile, roomId);

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ room_id: roomId, sender_id: req.profile.id, content: content.trim() })
    .select("*, sender:sender_id(id, full_name, role)")
    .single();

  if (error) throw new ApiError(500, error.message);
  res.status(201).json({ message: data });
});
