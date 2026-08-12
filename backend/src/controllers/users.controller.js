import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Manager-only: list every user on the platform.
export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  let query = supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  res.json({ users: data });
});

// Manager-only: change a user's role (the ONLY way to become teacher/manager).
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const allowed = ["manager", "teacher", "student"];
  if (!allowed.includes(role)) throw new ApiError(400, `role must be one of ${allowed.join(", ")}`);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(500, error.message);
  res.json({ user: data });
});

// Any authenticated user can fetch their own profile; teachers/managers can
// fetch profiles they're entitled to see (enforced by RLS via req.db too).
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.profile.role !== "manager" && req.profile.id !== id) {
    // Let RLS on req.db decide teacher-of-student-in-their-course visibility.
    const { data, error } = await req.db.from("profiles").select("*").eq("id", id).single();
    if (error || !data) throw new ApiError(403, "Not authorized to view this profile");
    return res.json({ user: data });
  }

  const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", id).single();
  if (error) throw new ApiError(404, "User not found");
  res.json({ user: data });
});
