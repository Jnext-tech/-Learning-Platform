import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

/**
 * Frontend route guards are a UX convenience only — the real authorization
 * happens on the backend (JWT + role checks) and in Supabase RLS. Never
 * treat this component as a security boundary by itself.
 */
export default function ProtectedRoute({ roles, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <div className="page">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
