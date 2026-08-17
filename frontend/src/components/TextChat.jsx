import { useEffect, useRef, useState } from "react";
import api from "../services/api.js";
import { supabase } from "../supabaseClient.js";

export default function TextChat({ roomId }) {
  const [messages, setMessages] = useState([]); const [draft, setDraft] = useState(""); const [error, setError] = useState(""); const bottomRef = useRef(null);
  useEffect(() => { let channel; async function init() { try { const { data } = await api.get(`/messages/room/${roomId}`); setMessages(data.messages); } catch (err) { setError(err.message); } channel = supabase.channel(`messages:${roomId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new])).subscribe(); } init(); return () => { if (channel) supabase.removeChannel(channel); }; }, [roomId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const send = async (e) => { e.preventDefault(); if (!draft.trim()) return; try { await api.post(`/messages/room/${roomId}`, { content: draft }); setDraft(""); } catch (err) { setError(err.message); } };
  return <div className="room-chat"><div className="room-chat__messages">{messages.map((m) => <div key={m.id} className="room-message"><div className="room-message__meta"><strong>{m.sender?.full_name || "مشاركة"}</strong><span>{new Date(m.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span></div><p>{m.content}</p></div>)}<div ref={bottomRef} /></div>{!messages.length && <div className="room-chat__empty">ابدئي المحادثة برسالة لطيفة ✦</div>}{error && <p className="error-text">{error}</p>}<form onSubmit={send} className="room-chat__form"><input placeholder="اكتبي رسالة..." value={draft} onChange={(e) => setDraft(e.target.value)} /><button type="submit">إرسال <span>←</span></button></form></div>;
}
