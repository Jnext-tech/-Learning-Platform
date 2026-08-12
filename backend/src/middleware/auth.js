import { supabaseAdmin, supabaseForUser } from "../config/supabase.js";

/**
 * Verifies the Supabase JWT sent as `Authorization: Bearer <token>`.
 * Attaches:
 *   req.user       -> the Supabase auth user object
 *   req.profile    -> the row from `profiles` (contains the authoritative role)
 *   req.db         -> a Supabase client scoped to this user's JWT (RLS applies)
 *
 * The role is ALWAYS re-read from the `profiles` table on the backend.
 * We never trust a role claimed by the client.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "No profile found for this account" });
    }

    req.user = userData.user;
    req.profile = profile;
    req.accessToken = token;
    req.db = supabaseForUser(token); // RLS-scoped client for defense in depth

    next();
  } catch (err) {
    next(err);
  }
}
