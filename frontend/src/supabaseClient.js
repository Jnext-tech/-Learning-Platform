import { createClient } from "@supabase/supabase-js";

// Only the anon key is ever used in the frontend. The service-role key
// lives exclusively in the backend's environment.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
