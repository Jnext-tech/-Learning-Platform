import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import quranLogo from "../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page" dir="rtl">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <img src={quranLogo} alt="شعار منصة الفرقان" />
          <div className="auth-rule" />
        </div>
        <h1 id="login-title" className="sr-only">تسجيل الدخول</h1>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="sr-only" htmlFor="login-email">البريد الإلكتروني</label>
            <input id="login-email" type="email" required placeholder="ادخل البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="login-password">كلمة المرور</label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="ادخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
        <nav className="auth-links" aria-label="روابط الحساب">
          <Link to="/forgot-password">نسيت كلمة السر</Link>
          <Link to="/register">إنشاء حساب</Link>
        </nav>
      </section>
    </main>
  );
}
