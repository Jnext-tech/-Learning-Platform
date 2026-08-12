import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";

export default function ManagerDashboard() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, coursesRes, roomsRes] = await Promise.all([
          api.get("/users"),
          api.get("/courses"),
          api.get("/rooms"),
        ]);
        setUsers(usersRes.data.users);
        setCourses(coursesRes.data.courses);
        setRooms(roomsRes.data.rooms);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      const { data } = await api.get("/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalTeachers = users.filter((u) => u.role === "teacher").length;

  return (
    <div className="page">
      <h2>Manager dashboard</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
        <div className="card stat-card">
          <div className="stat-value">{totalStudents}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalTeachers}</div>
          <div className="stat-label">Teachers</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{courses.length}</div>
          <div className="stat-label">Courses</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Users</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Change role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>
                    <span className="badge badge-status">{u.role}</span>
                  </td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="manager">manager</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>All rooms</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rooms.map((r) => (
              <li key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/rooms/${r.id}`}>{r.name}</Link>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {r.course?.name} · {r.start_date} · <span className="badge badge-status">{r.status}</span>{" "}
                  <Link to={`/attendance?roomId=${r.id}`} style={{ fontSize: "0.8rem" }}>
                    View attendance
                  </Link>
                </div>
              </li>
            ))}
            {rooms.length === 0 && <p style={{ color: "var(--text-muted)" }}>No rooms yet.</p>}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>All courses</h3>
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Teacher</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/courses/${c.id}`}>{c.name}</Link>
                </td>
                <td>{c.teacher?.full_name}</td>
                <td>
                  <span className="badge badge-status">{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
