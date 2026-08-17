import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import madinaImage from "../assets/Madina Al Manaowara Masha Allah.jpg";

function RoomTime({ room }) {
  const date = room.start_date || "";
  const start = room.start_time || "";
  const end = room.end_time || "";
  return <span>{date} {start && end ? `· ${start}–${end}` : ""}</span>;
}

export default function StudentDashboard() {
  const [myCourses, setMyCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [allRes, myRes, roomsRes] = await Promise.all([
        api.get("/courses"), api.get("/registrations/me"), api.get("/rooms"),
      ]);
      const registeredIds = new Set(myRes.data.registrations.map((r) => r.course_id));
      setMyCourses(myRes.data.registrations.map((r) => r.course));
      setAvailableCourses(allRes.data.courses.filter((c) => !registeredIds.has(c.id)));
      setRooms(roomsRes.data.rooms);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { load(); }, []);

  const register = async (courseId) => {
    try { await api.post("/registrations", { courseId }); await load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="student-dashboard" dir="rtl">
      <aside className="student-dashboard__art" aria-hidden="true"><img src={madinaImage} alt="" /></aside>
      <section className="student-dashboard__content">
        {error && <p className="error-text">{error}</p>}
        <section className="student-panel">
          <h2>دوراتي التدريبية</h2>
          <ul className="student-list">
            {myCourses.map((course) => <li key={course.id}><Link to={`/courses/${course.id}`}>{course.name}</Link><span>المعلمة: {course.teacher?.full_name || "غير محدد"}</span></li>)}
            {myCourses.length === 0 && <li className="student-list__empty">لم تسجل في أي دورة بعد.</li>}
          </ul>
        </section>
        <section className="student-panel">
          <h2>الغرف القادمة</h2>
          <ul className="student-list student-list--rooms">
            {rooms.map((room) => <li key={room.id}><Link to={`/rooms/${room.id}`}>{room.name}</Link><RoomTime room={room} /></li>)}
            {rooms.length === 0 && <li className="student-list__empty">لا توجد غرف قادمة.</li>}
          </ul>
        </section>
        <section className="student-panel student-panel--available">
          <h2>الدورات المتاحة</h2>
          <ul className="student-list">
            {availableCourses.map((course) => <li className="student-list__available" key={course.id}><span>{course.name}</span><button onClick={() => register(course.id)}>التسجيل</button></li>)}
            {availableCourses.length === 0 && <li className="student-list__empty">لا توجد دورات جديدة متاحة.</li>}
          </ul>
        </section>
      </section>
    </div>
  );
}
