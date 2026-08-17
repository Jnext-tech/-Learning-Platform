import { useAuth } from "../hooks/useAuth.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

function UserIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="22" r="11" /><path d="M13 54c3-11 11-17 19-17s16 6 19 17" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="14" width="48" height="36" rx="4" /><path d="m10 18 22 16 22-16" /></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="15" width="46" height="40" rx="4" /><path d="M9 28h46M21 9v12M43 9v12" /></svg>;
}

export default function Profile() {
  const { profile } = useAuth();
  if (!profile) return <div className="app-loading"><LoadingSpinner label="جارٍ تحميل الملف الشخصي..." /></div>;

  const joinedAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-CA")
    : "—";

  if (profile.role !== "student") {
    return <div className="page" style={{ maxWidth: 480 }}><h2>Profile</h2><div className="card"><p><strong>Full name:</strong> {profile.full_name}</p><p><strong>Email:</strong> {profile.email}</p><p><strong>Role:</strong> {profile.role}</p></div></div>;
  }

  return (
    <div className="student-profile" dir="rtl">
      <header className="student-profile__heading">
        <div><UserIcon /></div>
        <span><strong>الملف الشخصي</strong><small>إدارة معلوماتك الشخصية و تفاصيل التواصل</small></span>
      </header>
      <section className="student-profile__card">
        <div className="student-profile__avatar"><UserIcon /><span>تعديل</span></div>
        <dl className="student-profile__details">
          <div><dt><UserIcon />الاسم الكامل:</dt><dd>{profile.full_name || "—"}</dd></div>
          <div><dt><MailIcon />البريد الإلكتروني:</dt><dd dir="ltr">{profile.email || "—"}</dd></div>
          <div><dt><CalendarIcon />تاريخ الاشتراك:</dt><dd dir="ltr">{joinedAt}</dd></div>
        </dl>
        <footer><button type="button">تعديل المعلومات</button></footer>
      </section>
    </div>
  );
}
