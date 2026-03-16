import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    );
}

export const REMEMBER_KEY = "app_remember_session";
const AUTH_TOKEN_KEY = Object.keys(localStorage).find(k => k.includes("sb-") && k.includes("-auth-token"));
if (localStorage.getItem(REMEMBER_KEY) === "true" && AUTH_TOKEN_KEY) {
  const stored = localStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) sessionStorage.setItem(AUTH_TOKEN_KEY, stored);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
