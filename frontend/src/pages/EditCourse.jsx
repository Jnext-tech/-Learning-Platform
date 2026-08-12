import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api.js";

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/courses/${id}`).then(({ data }) => {
      setForm({
        name: data.course.name,
        description: data.course.description || "",
        status: data.course.status,
      });
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.put(`/courses/${id}`, form);
      navigate(`/courses/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    try {
      await api.delete(`/courses/${id}`);
      navigate("/courses");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="card">
        <h2>Edit course</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              Delete course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
