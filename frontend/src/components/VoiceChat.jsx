import { useEffect, useRef, useState } from "react";

// Public STUN server for NAT traversal in development. For production,
// add a TURN server (e.g. via Twilio, Cloudflare, or coturn) so calls
// still connect when both peers are behind restrictive NATs.
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * Full-mesh WebRTC voice chat: every participant opens a direct
 * RTCPeerConnection to every other participant in voice. This is simple
 * and works well for small class sizes; for larger rooms this component's
 * signaling boundary (join/leave/mute/signal events) can be swapped for
 * an SFU (e.g. mediasoup/LiveKit) without changing the rest of the app.
 */
export default function VoiceChat({ socketRef, roomId, participants, currentUserId }) {
  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState("");

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // socketId -> HTMLAudioElement
  const pendingCandidatesRef = useRef(new Map());

  useEffect(() => {
    
    const socket = socketRef.current;
    if (!socket) return undefined;

const handleSignal = async ({ from, description, candidate }) => {
  let pc = peersRef.current.get(from);

  if (!pc) {
    pc = createPeerConnection(from);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
  }

  if (description) {
    await pc.setRemoteDescription(description);

    // Add candidates that arrived before the remote description
    const pending = pendingCandidatesRef.current.get(from) || [];

    for (const c of pending) {
      await pc.addIceCandidate(c);
    }

    pendingCandidatesRef.current.delete(from);

    if (description.type === "offer") {
      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socketRef.current.emit("voice:signal", {
        to: from,
        description: pc.localDescription,
      });
    }
  }

  if (candidate) {
    if (pc.remoteDescription) {
      await pc.addIceCandidate(candidate);
    } else {
      const pending = pendingCandidatesRef.current.get(from) || [];

      pending.push(candidate);

      pendingCandidatesRef.current.set(from, pending);
    }
  }
};

    const handlePeerJoined = async ({ socketId }) => {

  if (!inVoice || !localStreamRef.current) {
    return;
  }

  const pc = createPeerConnection(socketId);

  localStreamRef.current.getTracks().forEach((track) => {
    pc.addTrack(track, localStreamRef.current);
  });

  const offer = await pc.createOffer();


  await pc.setLocalDescription(offer);


  socket.emit("voice:signal", {
    to: socketId,
    description: pc.localDescription,
  });
};

    const handlePeerLeft = ({ socketId }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      const el = audioElsRef.current.get(socketId);
      if (el) {
        el.remove();
        audioElsRef.current.delete(socketId);
      }
    };

    socket.on("voice:signal", handleSignal);
    socket.on("voice:peer-joined", handlePeerJoined);
    socket.on("voice:peer-left", handlePeerLeft);

    return () => {
      socket.off("voice:signal", handleSignal);
      socket.off("voice:peer-joined", handlePeerJoined);
      socket.off("voice:peer-left", handlePeerLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inVoice]);

  function createPeerConnection(socketId) {

  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {

      socketRef.current.emit("voice:signal", {
        to: socketId,
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = (e) => {

    let audioEl = audioElsRef.current.get(socketId);

    if (!audioEl) {
      audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioElsRef.current.set(socketId, audioEl);
    }

    audioEl.srcObject = e.streams[0];
  };

  peersRef.current.set(socketId, pc);

  return pc;
}

  const joinVoice = async () => {
  setError("");

  try {
    console.log("1. JOIN VOICE CLICKED");
    console.log("2. socket:", socketRef.current);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    console.log("3. MICROPHONE OK", stream);

    // Start muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    localStreamRef.current = stream;

    setMuted(true);
    setInVoice(true);

    console.log("4. EMITTING voice:join");

    socketRef.current.emit("voice:join", { roomId });

    console.log("5. voice:join SENT");

  } catch (err) {
    console.error("VOICE ERROR:", err);

    setError(
      `Microphone access denied or unavailable: ${err.message}`
    );
  }
};

  const leaveVoice = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    audioElsRef.current.forEach((el) => el.remove());
    audioElsRef.current.clear();
    setInVoice(false);
    socketRef.current?.emit("voice:leave", { roomId });
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    socketRef.current?.emit("voice:mute", { roomId, muted: next });
  };

  return (
    <div>
      <h4 style={{ margin: "0 0 0.5rem" }}>Voice participants</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {participants.map((p) => (
          <li key={p.socketId} style={{ padding: "0.25rem 0" }}>
            {p.inVoice ? (p.muted ? "🔇" : "🎙") : "⚪"} {p.fullName}{" "}
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({p.role})</span>
          </li>
        ))}
      </ul>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        {!inVoice ? (
          <button className="btn-primary" onClick={joinVoice}>
            🎙 Join voice
          </button>
        ) : (
          <>
            <button className="btn-secondary" onClick={toggleMute}>
              {muted ? "🔇 Unmute" : "🎤 Mute"}
            </button>
            <button className="btn-danger" onClick={leaveVoice}>
              📞 Leave voice
            </button>
          </>
        )}
      </div>
    </div>
  );
}
