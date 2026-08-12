import { createContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import api from "../services/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setProfile(data.profile);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (fullName, email, password) => {
    await api.post("/auth/register", { fullName, email, password });
    await login(email, password);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email) => {
    await api.post("/auth/password-reset", { email });
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, login, register, logout, requestPasswordReset, reloadProfile: loadProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
