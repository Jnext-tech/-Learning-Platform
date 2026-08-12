import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../hooks/useAuth.js";

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

  if (loading) return <div className="page">Loading courses...</div>;

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
