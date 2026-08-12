import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";

export default function CourseDetails() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "",
    description: "",
    startDate: "",
    startTime: "",
    endTime: "",
  });

  const canManage = profile?.role === "manager" || (profile?.role === "teacher" && course?.teacher_id === profile.id);

  const load = async () => {
    try {
      const { data } = await api.get(`/courses/${id}`);
      setCourse(data.course);
      const roomsRes = await api.get(`/rooms?courseId=${id}`);
      setRooms(roomsRes.data.rooms);
      if (profile?.role !== "student") {
        try {
          const studentsRes = await api.get(`/courses/${id}/students`);
          setStudents(studentsRes.data.students);
        } catch {
          // not authorized (e.g. teacher viewing another teacher's course won't reach here anyway)
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/rooms", { courseId: id, ...roomForm });
      setShowRoomForm(false);
      setRoomForm({ name: "", description: "", startDate: "", startTime: "", endTime: "" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!course) return <div className="page">{error || "Loading..."}</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginBottom: "0.25rem" }}>{course.name}</h2>
          <p style={{ color: "var(--text-muted)" }}>{course.description}</p>
          <p style={{ fontSize: "0.9rem" }}>Teacher: {course.teacher?.full_name}</p>
        </div>
        {canManage && (
          <button className="btn-secondary" onClick={() => navigate(`/courses/${id}/edit`)}>
            Edit course
          </button>
        )}
      </div>

      <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Rooms</h3>
            {canManage && (
              <button className="btn-primary" onClick={() => setShowRoomForm((s) => !s)}>
                {showRoomForm ? "Cancel" : "+ Create room"}
              </button>
            )}
          </div>

          {showRoomForm && (
            <form onSubmit={handleCreateRoom} style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Room name</label>
                <input
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-3">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={roomForm.startDate}
                    onChange={(e) => setRoomForm({ ...roomForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Start</label>
                  <input
                    type="time"
                    required
                    value={roomForm.startTime}
                    onChange={(e) => setRoomForm({ ...roomForm, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End</label>
                  <input
                    type="time"
                    required
                    value={roomForm.endTime}
                    onChange={(e) => setRoomForm({ ...roomForm, endTime: e.target.value })}
                  />
                </div>
              </div>
              <button className="btn-primary" type="submit">
                Create room
              </button>
            </form>
          )}

          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {rooms.map((room) => (
              <li key={room.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/rooms/${room.id}`}>{room.name}</Link>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {room.start_date} · {room.start_time}–{room.end_time}{" "}
                  <span className="badge badge-status">{room.status}</span>
                </div>
              </li>
            ))}
            {rooms.length === 0 && <p style={{ color: "var(--text-muted)" }}>No rooms yet.</p>}
          </ul>
        </div>

        {profile?.role !== "student" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Registered students ({students.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student?.full_name}</td>
                    <td>{s.student?.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && <p style={{ color: "var(--text-muted)" }}>No students yet.</p>}
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
