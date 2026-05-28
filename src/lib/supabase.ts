import { createClient } from "@supabase/supabase-js";

export const REMEMBER_KEY = "remember_me";

const remembered = localStorage.getItem(REMEMBER_KEY) === "true";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: "sb-session",
      storage: remembered ? localStorage : sessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);