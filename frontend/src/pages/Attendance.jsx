import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18M8 15h3M14 15h2" /></svg>;
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default function Attendance() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const isStudent = profile?.role === "student";
  const isRoomView = roomId && !isStudent;

  useEffect(() => {
    async function load() {
      try {
        if (isRoomView) {
          const { data } = await api.get(`/attendance/room/${roomId}`);
          setRows(data.attendance.map((a) => ({ name: a.student?.full_name, status: a.status, firstJoined: a.first_joined_at, lastLeft: a.last_left_at })));
        } else {
          const { data } = await api.get("/attendance/me");
          setRows(data.attendance.map((a) => ({ name: `${a.room?.course?.name || ""} — ${a.room?.name || ""}`, status: a.status, firstJoined: a.first_joined_at, lastLeft: a.last_left_at })));
        }
      } catch (err) { setError(err.message); }
    }
    load();
  }, [roomId, isRoomView]);

  if (isStudent) {
    const presentCount = rows.filter((r) => r.status === "PRESENT").length;
    return <div className="student-attendance" dir="rtl">
      <header className="student-page-heading"><span className="student-page-heading__icon"><CalendarIcon /></span><span><strong>سجل الحضور</strong><small>متابعة حضورك في الجلسات التدريبية</small></span></header>
      {error && <p className="error-text">{error}</p>}
      <section className="attendance-summary" aria-label="ملخص الحضور">
        <div><span>إجمالي الجلسات</span><strong>{rows.length}</strong></div><div><span>جلسات حاضرة</span><strong>{presentCount}</strong></div><div><span>نسبة الحضور</span><strong>{rows.length ? `${Math.round((presentCount / rows.length) * 100)}%` : "—"}</strong></div>
      </section>
      <section className="attendance-card">
        <div className="attendance-card__head"><div><h1>سجل الجلسات</h1><p>تفاصيل وقت الدخول والخروج لكل جلسة</p></div><span className="attendance-card__count">{rows.length} جلسة</span></div>
        <div className="attendance-table-wrap"><table className="attendance-table"><thead><tr><th>الجلسة التدريبية</th><th>الحالة</th><th>وقت الدخول</th><th>وقت الخروج</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.name}-${i}`}><td data-label="الجلسة التدريبية"><strong>{r.name}</strong></td><td data-label="الحالة"><span className={`attendance-status ${r.status === "PRESENT" ? "attendance-status--present" : "attendance-status--absent"}`}>{r.status === "PRESENT" ? "حاضر" : "غائب"}</span></td><td data-label="وقت الدخول" className="attendance-time">{formatTime(r.firstJoined)}</td><td data-label="وقت الخروج" className="attendance-time">{formatTime(r.lastLeft)}</td></tr>)}</tbody></table></div>
        {!rows.length && <div className="student-empty-state"><CalendarIcon /><p>لا توجد سجلات حضور حتى الآن.</p></div>}
      </section>
    </div>;
  }

  return <div className="page"><h2>{isRoomView ? "Room attendance" : "My attendance"}</h2>{error && <p className="error-text">{error}</p>}<div className="card"><table><thead><tr><th>{isRoomView ? "Student" : "Session"}</th><th>Status</th><th>First joined</th><th>Last left</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td>{r.name}</td><td><span className={r.status === "PRESENT" ? "badge badge-present" : "badge badge-absent"}>{r.status}</span></td><td>{r.firstJoined ? new Date(r.firstJoined).toLocaleString() : "—"}</td><td>{r.lastLeft ? new Date(r.lastLeft).toLocaleString() : "—"}</td></tr>)}</tbody></table>{!rows.length && <p style={{ color: "var(--text-muted)" }}>No attendance records yet.</p>}</div></div>;
}
