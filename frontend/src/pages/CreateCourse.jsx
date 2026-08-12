import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";

export default function CreateCourse() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/courses", { name, description });
      navigate(`/courses/${data.course.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="card">
        <h2>Create a course</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating..." : "Create course"}
          </button>
        </form>
      </div>
    </div>
  );
}
