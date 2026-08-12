import { useAuth } from "../hooks/useAuth.js";

export default function Profile() {
  const { profile } = useAuth();

  if (!profile) return <div className="page">Loading...</div>;

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <h2>Profile</h2>
      <div className="card">
        <div className="form-group">
          <label>Full name</label>
          <p>{profile.full_name}</p>
        </div>
        <div className="form-group">
          <label>Email</label>
          <p>{profile.email}</p>
        </div>
        <div className="form-group">
          <label>Role</label>
          <span className="badge badge-status">{profile.role}</span>
        </div>
        <div className="form-group">
          <label>Member since</label>
          <p>{new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
