import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  dbId: string;
  name: string;
  email: string;
  initials: string;
  role: string | null;
  org_id: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Build a minimal AuthUser from the raw Supabase auth user as a fallback. */
function authUserFallback(authUser: { id: string; email?: string }): AuthUser {
  const email = authUser.email ?? "";
  const initial = email[0]?.toUpperCase() ?? "?";
  return {
    id: authUser.id,
    dbId: authUser.id,
    name: email,
    email,
    initials: initial,
    role: null,
    org_id: null,
  };
}

async function fetchUserProfile(authUserId: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role, org_id")
      .eq("clerk_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error.message);
      return null;
    }

    if (!data) {
      console.warn("No user profile found for authUserId:", authUserId);
      return null;
    }

    const firstName = data.first_name ?? "";
    const lastName = data.last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ") || data.email;
    const initials = [firstName[0], lastName[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || data.email?.[0]?.toUpperCase() || "?";

    return {
      id: authUserId,
      dbId: data.id,
      name,
      email: data.email,
      initials,
      role: data.role ?? null,
      org_id: data.org_id ?? null,
    };
  } catch (err) {
    console.error("fetchUserProfile threw unexpectedly:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    // This also handles the initial session check in Supabase v2
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id);

        try {
          if (session?.user) {
            setIsAuthenticated(true);

            // Set fallback data immediately to unblock UI
            setUser(prev => prev || authUserFallback(session.user));

            // Fetch full profile but don't let it block the loading state Transition
            fetchUserProfile(session.user.id).then(profile => {
              if (profile) setUser(profile);
            }).catch(err => {
              console.error("Profile background fetch failed:", err);
            });
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error("onAuthStateChange error:", err);
        } finally {
          // Unblock the app as soon as we have a routing decision
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
