import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

export default function TeacherDashboard() {
  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const coursesRes = await api.get("/courses?mine=true");
        setCourses(coursesRes.data.courses);
        const roomsRes = await api.get("/rooms");
        setRooms(roomsRes.data.rooms);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>My teaching dashboard</h2>
        <Link to="/courses/new">
          <button className="btn-primary">+ Create course</button>
        </Link>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>My courses</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {courses.map((c) => (
              <li key={c.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/courses/${c.id}`}>{c.name}</Link>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{c.description}</div>
              </li>
            ))}
            {courses.length === 0 && <p style={{ color: "var(--text-muted)" }}>You haven't created any courses yet.</p>}
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>My rooms</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rooms.map((r) => (
              <li key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/rooms/${r.id}`}>{r.name}</Link>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {r.course?.name} · {r.start_date} · <span className="badge badge-status">{r.status}</span>{" "}
                  <Link to={`/attendance?roomId=${r.id}`}>Attendance</Link>
                </div>
              </li>
            ))}
            {rooms.length === 0 && <p style={{ color: "var(--text-muted)" }}>No rooms yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
