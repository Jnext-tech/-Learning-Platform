import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function Home() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="app-loading"><LoadingSpinner label="جارٍ تحميل حسابك..." /></div>;

  const byRole = { manager: "/manager", teacher: "/teacher", student: "/student" };
  return <Navigate to={byRole[profile?.role] || "/login"} replace />;
}
