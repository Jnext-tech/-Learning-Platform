import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function Home() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="page">Loading...</div>;

  const byRole = { manager: "/manager", teacher: "/teacher", student: "/student" };
  return <Navigate to={byRole[profile?.role] || "/login"} replace />;
}
