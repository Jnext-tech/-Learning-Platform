import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2>Reset your password</h2>
        {sent ? (
          <p>Check your email for a password reset link.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" style={{ width: "100%" }}>
              Send reset link
            </button>
          </form>
        )}
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
