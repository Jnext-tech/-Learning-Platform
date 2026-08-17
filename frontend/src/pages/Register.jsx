import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import quranLogo from "../assets/logo.png";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(fullName, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page" dir="rtl">
      <section className="auth-card auth-card--register" aria-labelledby="register-title">
        <div className="auth-brand">
          <img src={quranLogo} alt="شعار منصة الفرقان" />
          <div className="auth-rule" />
        </div>
        <h1 id="register-title" className="sr-only">إنشاء حساب</h1>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="sr-only" htmlFor="register-name">الاسم الكامل</label>
            <input id="register-name" required placeholder="ادخل الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="register-email">البريد الإلكتروني</label>
            <input id="register-email" type="email" required placeholder="ادخل البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="sr-only" htmlFor="register-password">كلمة المرور</label>
            <input
              id="register-password"
              type="password"
              required
              minLength={6}
              placeholder="ادخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
          </button>
        </form>
        <p className="auth-login-prompt">لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link></p>
      </section>
    </main>
  );
}
