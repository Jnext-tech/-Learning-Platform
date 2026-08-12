import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { supabase } from "../supabaseClient.js";

export function useRoomSocket(roomId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;

    async function connect() {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token || cancelled) return;

      const socket = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("room:join", { roomId }, (ack) => {
          if (!ack?.ok) {
            setJoinError(ack?.error || "Unable to join room");
            return;
          }
          setConnected(true);
          setParticipants(ack.participants || []);
        });
      });

      socket.on("room:participants", (list) => setParticipants(list));
      socket.on("room:activity", (event) =>
        setActivityFeed((prev) => [...prev.slice(-49), event])
      );
      socket.on("disconnect", () => setConnected(false));
    }

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.emit("room:leave");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId]);

  return { socket: socketRef, connected, participants, activityFeed, joinError };
}
