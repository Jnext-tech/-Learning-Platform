import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

function BookIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 18c-8-6-16-5-23-2v32c7-3 15-4 23 2 8-6 16-5 23-2V16c-7-3-15-4-23 2Z" /><path d="M32 18v32" /></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="22" r="11" /><path d="M13 54c3-11 11-17 19-17s16 6 19 17" /></svg>;
}

export default function Courses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/courses");
      setCourses(data.courses);
      if (profile?.role === "student") {
        const regs = await api.get("/registrations/me");
        setMyRegistrations(regs.data.registrations.map((r) => r.course_id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleRegister = async (courseId) => {
    try {
      await api.post("/registrations", { courseId });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="app-loading" dir="rtl"><LoadingSpinner label="جارٍ تحميل الدورات..." /></div>;

  if (profile?.role === "student") {
    return (
      <div className="student-courses" dir="rtl">
        <header className="student-courses__heading">
          <div><BookIcon /></div>
          <span><strong>الدورات التدريبية</strong><small>الدورات المتاحة للتسجيل</small></span>
        </header>
        {error && <p className="error-text">{error}</p>}
        <div className="student-course-grid">
          {courses.map((course) => {
            const registered = myRegistrations.includes(course.id);
            const isActive = course.status?.toLowerCase() !== "inactive";
            return (
              <article className="student-course-card" key={course.id}>
                <Link className="student-course-card__details" to={`/courses/${course.id}`}>تفاصيل الدورة <BookIcon /></Link>
                <div className="student-course-card__info"><strong>{course.name}</strong></div>
                <div className="student-course-card__info">المعلمة: {course.teacher?.full_name || "غير محدد"}</div>
                <footer>
                  <span className={`student-course-card__status ${isActive ? "" : "student-course-card__status--inactive"}`}>{isActive ? "نشطة" : "غير نشطة"}</span>
                  {registered ? <Link className="student-course-card__registered" to={`/courses/${course.id}`}>مسجل <UserIcon /></Link> : <button onClick={() => handleRegister(course.id)}>التسجيل <UserIcon /></button>}
                </footer>
              </article>
            );
          })}
          {courses.length === 0 && <p className="student-courses__empty">لا توجد دورات متاحة حالياً.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Courses</h2>
        {(profile?.role === "teacher" || profile?.role === "manager") && (
          <Link to="/courses/new">
            <button className="btn-primary">+ Create course</button>
          </Link>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        {courses.map((course) => {
          const registered = myRegistrations.includes(course.id);
          return (
            <div className="card" key={course.id}>
              <h3 style={{ margin: "0 0 0.25rem" }}>
                <Link to={`/courses/${course.id}`}>{course.name}</Link>
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{course.description}</p>
              <p style={{ fontSize: "0.85rem" }}>Teacher: {course.teacher?.full_name}</p>
              <span className="badge badge-status">{course.status}</span>
              {profile?.role === "student" && (
                <div style={{ marginTop: "0.75rem" }}>
                  {registered ? (
                    <span className="badge badge-present">Registered</span>
                  ) : (
                    <button className="btn-primary" onClick={() => handleRegister(course.id)}>
                      Register
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {courses.length === 0 && <p>No courses yet.</p>}
      </div>
    </div>
  );
}
