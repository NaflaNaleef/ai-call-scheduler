import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, REMEMBER_KEY } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface AuthUser {
  id: string;
  dbId: string;
  name: string;
  email: string;
  initials: string;
  role: string | null;
  org_id: string | null;
  is_active: boolean;
}

export interface OrgSubscription {
  plan_id: string;
  plan_name: string;
  price_monthly: number;
  stripe_customer_id: string | null;
  status: string;
  max_contacts: number;
  max_campaigns: number;
  max_call_minutes_per_month: number;
  max_team_members: number;
  max_contacts_per_run: number;
  max_retries: number;
  allow_scheduling: boolean;
  allow_recurring: boolean;
  calls_made: number;
  call_minutes_used: number;
  contacts_count: number;
  campaigns_count: number;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'azure') => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  subscription: OrgSubscription | null;
  subscriptionLoading: boolean;
  refreshSubscription: () => Promise<void>;
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
    is_active: true,
  };
}

export async function fetchUserProfile(authUserId: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role, org_id, is_active")
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

    if (data.is_active === false) {
      console.log('User account deactivated — signing out');
      await supabase.auth.signOut();
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
      is_active: data.is_active ?? true,
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
  const [subscription, setSubscription] = useState<OrgSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const { toast } = useToast();

  const prevUsageRef = React.useRef<{
    contactsPct: number;
    campaignsPct: number;
    minutesPct: number;
  } | null>(null);

  const checkUsageAndNotify = (newSub: OrgSubscription) => {
    const calc = (used: number, max: number) => {
      if (max === -1) return 0;
      return Math.round((used / max) * 100);
    };

    const contactsPct = calc(newSub.contacts_count, newSub.max_contacts);
    const campaignsPct = calc(newSub.campaigns_count, newSub.max_campaigns);
    const minutesPct = calc(newSub.call_minutes_used, newSub.max_call_minutes_per_month);

    const prev = prevUsageRef.current;

    // Call minutes warnings
    if (minutesPct >= 100 && (!prev || prev.minutesPct < 100)) {
      toast({
        title: "⛔ Call minutes limit reached",
        description: "You've used all your call minutes. Campaigns will be blocked until you upgrade.",
        variant: "destructive",
      });
    } else if (minutesPct >= 80 && (!prev || prev.minutesPct < 80)) {
      toast({
        title: "⚠️ Call minutes at 80%",
        description: `You've used ${newSub.call_minutes_used} of ${newSub.max_call_minutes_per_month} minutes this month.`,
      });
    }

    // Contacts warnings
    if (contactsPct >= 100 && (!prev || prev.contactsPct < 100)) {
      toast({
        title: "⛔ Contact limit reached",
        description: "You've reached your contact limit. Upgrade your plan to add more contacts.",
        variant: "destructive",
      });
    } else if (contactsPct >= 80 && (!prev || prev.contactsPct < 80)) {
      toast({
        title: "⚠️ Contacts at 80%",
        description: `You've used ${newSub.contacts_count} of ${newSub.max_contacts} contacts.`,
      });
    }

    // Campaigns warnings
    if (campaignsPct >= 100 && (!prev || prev.campaignsPct < 100)) {
      toast({
        title: "⛔ Campaign limit reached",
        description: "You've reached your campaign limit. Upgrade your plan to launch more campaigns.",
        variant: "destructive",
      });
    } else if (campaignsPct >= 80 && (!prev || prev.campaignsPct < 80)) {
      toast({
        title: "⚠️ Campaigns at 80%",
        description: `You've used ${newSub.campaigns_count} of ${newSub.max_campaigns} campaigns.`,
      });
    }

    // Update ref with current percentages
    prevUsageRef.current = { contactsPct, campaignsPct, minutesPct };
  };

  const fetchSubscription = async (orgId: string) => {
    if (!orgId) return;
    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('f_get_org_subscription_and_usage', { p_org_id: orgId });
      if (!error && data?.[0]) {
        setSubscription(data[0]);
        checkUsageAndNotify(data[0]);
      }
    } catch (err) {
      console.error('fetchSubscription error:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (user?.org_id) await fetchSubscription(user.org_id);
  };

  useEffect(() => {
    // Listen for auth state changes
    // This also handles the initial session check in Supabase v2
    let usageChannel: any = null;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id);

        try {
          if (session?.user) {
            setIsAuthenticated(true);

            // Set fallback data immediately to unblock UI
            setUser(prev => prev || authUserFallback(session.user));

            // Fetch full profile but don't let it block the loading state Transition
            fetchUserProfile(session.user.id).then(async profile => {
              if (profile) {
                if (profile.is_active === false) {
                  console.log('Deactivated user detected — signing out');
                  await supabase.auth.signOut();
                  return;
                }
                setUser(profile);
                if (profile.org_id) {
                  fetchSubscription(profile.org_id);
                  // Real-time usage updates
                  usageChannel = supabase
                    .channel('auth_org_usage')
                    .on('postgres_changes', {
                      event: 'UPDATE',
                      schema: 'public',
                      table: 'org_usage',
                      filter: `org_id=eq.${profile.org_id}`
                    }, () => {
                      fetchSubscription(profile.org_id!);
                    })
                    .subscribe();
                }
              }
            }).catch(err => {
              console.error("Profile background fetch failed:", err);
            });
          } else {
            setUser(null);
            setIsAuthenticated(false);
            setSubscription(null);
          }
        } catch (err) {
          console.error("onAuthStateChange error:", err);
        } finally {
          // Unblock the app as soon as we have a routing decision
          setLoading(false);
        }
      }
    );

    return () => {
      authSub.unsubscribe();
      if (usageChannel) supabase.removeChannel(usageChannel);
    };
  }, []);


  const login = async (email: string, password: string, remember: boolean = false) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, "true");
      // Copy session from sessionStorage to localStorage for persistence
      const tokenKey = Object.keys(sessionStorage).find(k => k.includes("sb-") && k.includes("-auth-token"));
      if (tokenKey) localStorage.setItem(tokenKey, sessionStorage.getItem(tokenKey)!);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      // Clear any previously remembered session
      const tokenKey = Object.keys(localStorage).find(k => k.includes("sb-") && k.includes("-auth-token"));
      if (tokenKey) localStorage.removeItem(tokenKey);
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  };

  const loginWithOAuth = async (provider: 'google' | 'azure') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    localStorage.removeItem(REMEMBER_KEY);
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    const profile = await fetchUserProfile(user.id);
    if (profile) {
      setUser(profile);
      if (profile.org_id) fetchSubscription(profile.org_id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading, 
      login, 
      loginWithOAuth, 
      signUp, 
      logout, 
      refreshUser,
      subscription,
      subscriptionLoading,
      refreshSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
