import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useRoomSocket } from "../hooks/useRoomSocket.js";
import VoiceChat from "../components/VoiceChat.jsx";
import TextChat from "../components/TextChat.jsx";

export default function Room() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [accessError, setAccessError] = useState("");
  const [ending, setEnding] = useState(false);

  const { socket, connected, participants, activityFeed, joinError } = useRoomSocket(
    accessError ? null : id
  );

  useEffect(() => {
    async function checkAndLoad() {
      try {
        // Backend is the source of truth for room access — verified here
        // before we even attempt to open the realtime connection.
        await api.get(`/rooms/${id}/access-check`);
        const { data } = await api.get(`/rooms/${id}`);
        setRoom(data.room);
      } catch (err) {
        setAccessError(err.message || "You do not have access to this room");
      }
    }
    checkAndLoad();
  }, [id]);

  const canManageRoom =
    profile?.role === "manager" || (profile?.role === "teacher" && room?.course?.teacher?.full_name);

  const handleEndRoom = async () => {
    if (!confirm("End this session? Attendance will be finalized for all registered students.")) return;
    setEnding(true);
    try {
      await api.post(`/rooms/${id}/end`);
      await api.get(`/rooms/${id}`).then(({ data }) => setRoom(data.room));
    } catch (err) {
      setAccessError(err.message);
    } finally {
      setEnding(false);
    }
  };

  if (accessError) {
    return (
      <div className="page">
        <div className="card">
          <h3>Access denied</h3>
          <p>{accessError}</p>
          <button className="btn-secondary" onClick={() => navigate("/courses")}>
            Back to courses
          </button>
        </div>
      </div>
    );
  }

  if (!room) return <div className="page">Loading room...</div>;

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{room.name}</h2>
            <p style={{ color: "var(--text-muted)", margin: "0.25rem 0" }}>
              {room.course?.name} · Teacher: {room.course?.teacher?.full_name}
            </p>
            <span className="badge badge-status">{room.status}</span>{" "}
            {!connected && !joinError && <span style={{ fontSize: "0.8rem" }}>Connecting...</span>}
            {joinError && <span className="error-text">{joinError}</span>}
          </div>
          {canManageRoom && room.status !== "ended" && (
            <button className="btn-danger" onClick={handleEndRoom} disabled={ending}>
              {ending ? "Ending..." : "End session"}
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr", minHeight: 420 }}>
        <div className="card">
          <VoiceChat
            socketRef={socket}
            roomId={id}
            participants={participants}
            currentUserId={profile?.id}
          />
          {activityFeed.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.4rem" }}>Recent activity</h4>
              <ul style={{ listStyle: "none", padding: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {activityFeed
                  .slice(-6)
                  .reverse()
                  .map((e, i) => (
                    <li key={i}>
                      {new Date(e.at).toLocaleTimeString()} — {e.fullName} {e.type}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
            Chat
          </div>
          <div style={{ flex: 1 }}>
            <TextChat roomId={id} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button className="btn-secondary" onClick={() => navigate(`/courses/${room.course_id}`)}>
          🚪 Leave room
        </button>
      </div>
    </div>
  );
}
