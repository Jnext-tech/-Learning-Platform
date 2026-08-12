import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] Missing Supabase env vars. Copy .env.example to .env and fill in your project keys."
  );
}

// Service-role client: full DB access, bypasses RLS. Server-side ONLY.
// Used for privileged writes the backend must guarantee correctness for
// (attendance rows, activity logs) rather than relying on RLS + client calls.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Per-request client: created with the caller's JWT so that Supabase RLS
// policies are evaluated as that specific user. Use this for reads/writes
// that should be constrained by RLS as a defense-in-depth layer under our
// own middleware authorization checks.
export function supabaseForUser(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
