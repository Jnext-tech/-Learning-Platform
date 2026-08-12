import { useEffect, useRef, useState } from "react";
import api from "../services/api.js";
import { supabase } from "../supabaseClient.js";

export default function TextChat({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let channel;

    async function init() {
      try {
        const { data } = await api.get(`/messages/room/${roomId}`);
        setMessages(data.messages);
      } catch (err) {
        setError(err.message);
      }

      // Supabase Realtime: live-push new rows inserted into `messages`
      // for this room, so every client's chat stays in sync without polling.
      channel = supabase
        .channel(`messages:${roomId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
          async (payload) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        )
        .subscribe();
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await api.post(`/messages/room/${roomId}`, { content: draft });
      setDraft("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {m.sender?.full_name || "Someone"} · {new Date(m.created_at).toLocaleTimeString()}
            </div>
            <div>{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <form onSubmit={send} style={{ display: "flex", gap: "0.5rem", padding: "0.5rem" }}>
        <input
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
