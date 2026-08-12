import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Registration is done server-side with the service role so we can safely
 * set the initial role. Only 'student' is self-selectable at signup —
 * promoting someone to 'teacher' or 'manager' is a Manager-only action
 * (see users.controller.js) so a client can never grant itself elevated
 * privileges via this endpoint.
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    throw new ApiError(400, "email, password and fullName are required");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student" },
  });

  if (error) throw new ApiError(400, error.message);

  res.status(201).json({
    message: "Account created. You can now log in.",
    userId: data.user.id,
  });
});

/**
 * Login is normally done directly from the frontend via supabase-js
 * (`supabase.auth.signInWithPassword`) so the session/refresh token is
 * managed client-side. This endpoint is offered for non-browser clients
 * or server-to-server testing.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "email and password are required");

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(401, error.message);

  res.json({ session: data.session, user: data.user });
});

export const logout = asyncHandler(async (req, res) => {
  await supabaseAdmin.auth.admin.signOut(req.accessToken);
  res.json({ message: "Logged out" });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "email is required");

  const redirectTo = `${process.env.CLIENT_URL}/reset-password`;
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new ApiError(400, error.message);

  res.json({ message: "Password reset email sent" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user, profile: req.profile });
});
