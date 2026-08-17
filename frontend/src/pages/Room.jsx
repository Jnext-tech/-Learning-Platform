import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useRoomSocket } from "../hooks/useRoomSocket.js";
import VoiceChat from "../components/VoiceChat.jsx";
import TextChat from "../components/TextChat.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function Room() {
  const { id } = useParams(); const { profile } = useAuth(); const navigate = useNavigate();
  const [room, setRoom] = useState(null); const [accessError, setAccessError] = useState(""); const [ending, setEnding] = useState(false);
  const { socket, connected, participants, activityFeed, joinError } = useRoomSocket(accessError ? null : id);
  useEffect(() => { async function checkAndLoad() { try { await api.get(`/rooms/${id}/access-check`); const { data } = await api.get(`/rooms/${id}`); setRoom(data.room); } catch (err) { setAccessError(err.message || "You do not have access to this room"); } } checkAndLoad(); }, [id]);
  const canManageRoom = profile?.role === "manager" || (profile?.role === "teacher" && room?.course?.teacher?.full_name);
  const handleEndRoom = async () => { if (!confirm("End this session? Attendance will be finalized for all registered students.")) return; setEnding(true); try { await api.post(`/rooms/${id}/end`); await api.get(`/rooms/${id}`).then(({ data }) => setRoom(data.room)); } catch (err) { setAccessError(err.message); } finally { setEnding(false); } };
  if (accessError) return <div className="page"><div className="card"><h3>Access denied</h3><p>{accessError}</p><button className="btn-secondary" onClick={() => navigate("/courses")}>Back to courses</button></div></div>;
  if (!room) return <div className="app-loading"><LoadingSpinner label="جارٍ تحميل الغرفة..." /></div>;
  return <div className="learning-room" dir="rtl">
    <header className="learning-room__header"><div className="learning-room__header-main"><button className="learning-room__back" onClick={() => navigate(`/courses/${room.course_id}`)} aria-label="العودة إلى الدورة">←</button><div><span className="learning-room__eyebrow">{room.course?.name || "الدورة التدريبية"}</span><h1>{room.name}</h1><p>المعلمة: {room.course?.teacher?.full_name || "غير محددة"}</p></div></div><div className="learning-room__connection"><span className={`connection-dot ${connected ? "connection-dot--online" : ""}`} />{joinError ? <span className="error-text">{joinError}</span> : connected ? "متصل الآن" : "جارٍ الاتصال..."}</div>{canManageRoom && room.status !== "ended" && <button className="learning-room__end" onClick={handleEndRoom} disabled={ending}>{ending ? "جارٍ إنهاء الجلسة..." : "إنهاء الجلسة"}</button>}</header>
    <div className="learning-room__workspace"><aside className="learning-room__side-card"><VoiceChat socketRef={socket} roomId={id} participants={participants} currentUserId={profile?.id} />{activityFeed.length > 0 && <div className="room-activity"><h3>النشاط الأخير</h3><ul>{activityFeed.slice(-6).reverse().map((e, i) => <li key={i}><span>{e.fullName}</span> {e.type}</li>)}</ul></div>}</aside><section className="learning-room__chat-card"><div className="learning-room__chat-heading"><span className="learning-room__chat-icon">✦</span><div><h2>المحادثة</h2><p>تواصل مع المعلمة وزميلاتك</p></div></div><TextChat roomId={id} /></section></div>
    <button className="learning-room__leave" onClick={() => navigate(`/courses/${room.course_id}`)}>مغادرة الغرفة <span>←</span></button>
  </div>;
}
