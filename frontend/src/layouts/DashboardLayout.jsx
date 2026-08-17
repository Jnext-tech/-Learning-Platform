import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import quranLogo from "../assets/logo.png";

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const homeByRole = {
    manager: "/manager",
    teacher: "/teacher",
    student: "/student",
  };

  if (profile?.role === "student") {
    return (
      <div className="student-shell" dir="rtl">
        <header className="student-header">
          <NavLink className="student-header__brand" to="/student"><img src={quranLogo} alt="شعار الفرقان" /><span><strong>الفرقان</strong><small>مركز الفرقان لتحفيظ القرآن الكريم</small></span></NavLink>
          <nav aria-label="التنقل الرئيسي">
            <NavLink to="/student">الصفحة الرئيسية</NavLink><NavLink to="/profile">الملف الشخصي</NavLink><NavLink to="/courses">الدورات التدريبية</NavLink><NavLink to="/attendance">سجل الحضور</NavLink>
          </nav>
          <button className="student-header__logout" onClick={async () => { await logout(); navigate("/login"); }}>تسجيل الخروج</button>
        </header>
        <main><Outlet /></main>
      </div>
    );
  }

  return (
    <div>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          padding: "0.85rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <strong style={{ fontSize: "1.05rem" }}>📚 Learning Platform</strong>
          <nav style={{ display: "flex", gap: "1rem" }}>
            <NavLink to={homeByRole[profile?.role] || "/"}>Dashboard</NavLink>
            <NavLink to="/courses">Courses</NavLink>
            {profile?.role === "student" && <NavLink to="/attendance">My Attendance</NavLink>}
            <NavLink to="/profile">Profile</NavLink>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="badge badge-status">{profile?.role}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{profile?.full_name}</span>
          <button
            className="btn-secondary"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
