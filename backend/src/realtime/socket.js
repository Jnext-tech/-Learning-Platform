import { Server } from "socket.io";
import { supabaseAdmin } from "../config/supabase.js";
import { assertRoomAccess } from "../services/access.service.js";
import { recordJoin, recordLeave } from "../services/attendance.service.js";

// roomId -> Map<socketId, { userId, fullName, role, muted }>
const roomPresence = new Map();

function getRoomMap(roomId) {
  if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
  return roomPresence.get(roomId);
}

function participantsList(roomId) {
  return Array.from(getRoomMap(roomId).entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
  }));
}

/**
 * Attaches Socket.IO to the HTTP server. Handles two concerns over one
 * connection per client:
 *   1. Room presence / text chat notifications (drives attendance + activity logs)
 *   2. WebRTC signaling relay (offer/answer/ICE) for voice chat — no audio
 *      media ever passes through this server, only small JSON signaling
 *      messages, so this scales independently of call size.
 */
export function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing auth token"));

      const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !userData?.user) return next(new Error("Invalid session"));

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();
      if (!profile) return next(new Error("No profile"));

      socket.profile = profile;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;

    socket.on("room:join", async ({ roomId }, ack) => {
      try {
        await assertRoomAccess(socket.profile, roomId);
      } catch (err) {
        return ack?.({ ok: false, error: err.message });
      }

      currentRoomId = roomId;
      socket.join(roomId);

      const presence = getRoomMap(roomId);
      presence.set(socket.id, {
        userId: socket.profile.id,
        fullName: socket.profile.full_name,
        role: socket.profile.role,
        muted: true,
        inVoice: false,
      });

      // Only students accrue attendance; teachers/managers are logged too
      // (useful for room activity logs) but don't factor into ABSENT/PRESENT.
      if (socket.profile.role === "student") {
        await recordJoin({ roomId, userId: socket.profile.id });
      } else {
        await supabaseAdmin.from("room_activity_logs").insert({
          room_id: roomId,
          user_id: socket.profile.id,
          event_type: "JOIN",
        });
      }

      io.to(roomId).emit("room:participants", participantsList(roomId));
      io.to(roomId).emit("room:activity", {
        type: "JOIN",
        userId: socket.profile.id,
        fullName: socket.profile.full_name,
        at: new Date().toISOString(),
      });

      ack?.({ ok: true, participants: participantsList(roomId) });
    });

    socket.on("room:leave", async () => {
      await handleLeave(io, socket, currentRoomId);
      currentRoomId = null;
    });

    // ---- Text chat presence ping (actual persistence is REST + Supabase Realtime) ----
    socket.on("chat:typing", ({ roomId, isTyping }) => {
      socket.to(roomId).emit("chat:typing", {
        userId: socket.profile.id,
        fullName: socket.profile.full_name,
        isTyping,
      });
    });

    // ---- Voice chat signaling (WebRTC) ----
    socket.on("voice:join", ({ roomId }) => {
      const presence = getRoomMap(roomId);
      const entry = presence.get(socket.id);
      if (entry) entry.inVoice = true;
      socket.to(roomId).emit("voice:peer-joined", { socketId: socket.id, profile: socket.profile });
      io.to(roomId).emit("room:participants", participantsList(roomId));
    });

    socket.on("voice:leave", ({ roomId }) => {
      const presence = getRoomMap(roomId);
      const entry = presence.get(socket.id);
      if (entry) entry.inVoice = false;
      socket.to(roomId).emit("voice:peer-left", { socketId: socket.id });
      io.to(roomId).emit("room:participants", participantsList(roomId));
    });

    socket.on("voice:mute", ({ roomId, muted }) => {
      const presence = getRoomMap(roomId);
      const entry = presence.get(socket.id);
      if (entry) entry.muted = muted;
      io.to(roomId).emit("room:participants", participantsList(roomId));
    });

    // Generic signaling relay: { to: socketId, description } for offer/answer,
    // or { to: socketId, candidate } for ICE candidates. The server never
    // inspects payloads — it just forwards them to the intended peer.
    socket.on("voice:signal", ({ to, ...payload }) => {
      io.to(to).emit("voice:signal", { from: socket.id, ...payload });
    });

    socket.on("disconnect", async () => {
      await handleLeave(io, socket, currentRoomId);
    });
  });

  return io;
}

async function handleLeave(io, socket, roomId) {
  if (!roomId) return;
  const presence = getRoomMap(roomId);
  presence.delete(socket.id);
  socket.leave(roomId);

  if (socket.profile.role === "student") {
    await recordLeave({ roomId, userId: socket.profile.id });
  } else {
    await supabaseAdmin.from("room_activity_logs").insert({
      room_id: roomId,
      user_id: socket.profile.id,
      event_type: "LEAVE",
    });
  }

  io.to(roomId).emit("voice:peer-left", { socketId: socket.id });
  io.to(roomId).emit("room:participants", participantsList(roomId));
  io.to(roomId).emit("room:activity", {
    type: "LEAVE",
    userId: socket.profile.id,
    fullName: socket.profile.full_name,
    at: new Date().toISOString(),
  });
}
