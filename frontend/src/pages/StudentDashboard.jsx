import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

export default function StudentDashboard() {
  const [myCourses, setMyCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [allRes, myRes, roomsRes] = await Promise.all([
        api.get("/courses"),
        api.get("/registrations/me"),
        api.get("/rooms"),
      ]);
      const registeredIds = new Set(myRes.data.registrations.map((r) => r.course_id));
      setMyCourses(myRes.data.registrations.map((r) => r.course));
      setAvailableCourses(allRes.data.courses.filter((c) => !registeredIds.has(c.id)));
      setRooms(roomsRes.data.rooms);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const register = async (courseId) => {
    try {
      await api.post("/registrations", { courseId });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <h2>My dashboard</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>My courses</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {myCourses.map((c) => (
              <li key={c.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/courses/${c.id}`}>{c.name}</Link>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Teacher: {c.teacher?.full_name}
                </div>
              </li>
            ))}
            {myCourses.length === 0 && <p style={{ color: "var(--text-muted)" }}>Not registered for any courses yet.</p>}
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Available courses</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {availableCourses.map((c) => (
              <li key={c.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>{c.name}</span>
                <button className="btn-primary" style={{ marginLeft: "0.75rem" }} onClick={() => register(c.id)}>
                  Register
                </button>
              </li>
            ))}
            {availableCourses.length === 0 && <p style={{ color: "var(--text-muted)" }}>No new courses available.</p>}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Upcoming rooms</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((r) => (
            <li key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
              <Link to={`/rooms/${r.id}`}>{r.name}</Link>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {r.course?.name} · {r.start_date} {r.start_time}–{r.end_time} ·{" "}
                <span className="badge badge-status">{r.status}</span>
              </div>
            </li>
          ))}
          {rooms.length === 0 && <p style={{ color: "var(--text-muted)" }}>No upcoming rooms.</p>}
        </ul>
      </div>
    </div>
  );
}
