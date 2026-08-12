import axios from "axios";
import { supabase } from "../supabaseClient.js";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Every request grabs the current Supabase session token. React never
// decides "who can do what" — the backend + RLS make that call; this
// just proves who the caller is.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message;
    return Promise.reject(new Error(message));
  }
);

export default api;
