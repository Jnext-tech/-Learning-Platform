import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";

export default function Attendance() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (roomId && profile?.role !== "student") {
          const { data } = await api.get(`/attendance/room/${roomId}`);
          setRows(
            data.attendance.map((a) => ({
              name: a.student?.full_name,
              status: a.status,
              firstJoined: a.first_joined_at,
              lastLeft: a.last_left_at,
            }))
          );
        } else {
          const { data } = await api.get("/attendance/me");
          setRows(
            data.attendance.map((a) => ({
              name: `${a.room?.course?.name} — ${a.room?.name}`,
              status: a.status,
              firstJoined: a.first_joined_at,
              lastLeft: a.last_left_at,
            }))
          );
        }
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [roomId, profile]);

  return (
    <div className="page">
      <h2>{roomId && profile?.role !== "student" ? "Room attendance" : "My attendance"}</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>{roomId && profile?.role !== "student" ? "Student" : "Session"}</th>
              <th>Status</th>
              <th>First joined</th>
              <th>Last left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td>
                  <span className={r.status === "PRESENT" ? "badge badge-present" : "badge badge-absent"}>
                    {r.status}
                  </span>
                </td>
                <td>{r.firstJoined ? new Date(r.firstJoined).toLocaleString() : "—"}</td>
                <td>{r.lastLeft ? new Date(r.lastLeft).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: "var(--text-muted)" }}>No attendance records yet.</p>}
      </div>
    </div>
  );
}
