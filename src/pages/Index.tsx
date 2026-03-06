import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Users,
  Megaphone,
  PhoneCall,
  TrendingUp,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalContacts: number;
  activeCampaigns: number;
  callsToday: number;
  totalCampaigns: number;
}

interface ActivityItem {
  id: string;
  action: string;
  time: string;
  status: "success" | "info" | "warning" | "error" | "neutral";
  phone?: string;
  campaign?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function mapCallStatus(status: string): "success" | "error" | "neutral" {
  switch (status?.toUpperCase()) {
    case "ANSWERED": return "success";
    case "FAILED":
    case "NO_ANSWER":
    case "BUSY":
    case "VOICEMAIL": return "error";
    default: return "neutral";
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Index = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    activeCampaigns: 0,
    callsToday: 0,
    totalCampaigns: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!user?.org_id) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [contactsRes, campaignsRes, callsRes] = await Promise.all([
        supabase.rpc("f_get_contacts", { p_org_id: user.org_id }),
        supabase.rpc("f_get_campaigns", { p_org_id: user.org_id }),
        supabase.rpc("f_get_org_call_logs", {
          p_org_id: user.org_id,
          p_limit: 20,
          p_offset: 0,
        }),
      ]);

      const contacts = contactsRes.data ?? [];
      const campaigns = campaignsRes.data ?? [];
      const calls = callsRes.data ?? [];

      const callsToday = calls.filter((c: any) =>
        c.created_at?.startsWith(today)
      ).length;

      const activeCampaigns = campaigns.filter(
        (c: any) => c.status?.toUpperCase() === "RUNNING"
      ).length;

      setStats({
        totalContacts: contacts.length,
        activeCampaigns,
        callsToday,
        totalCampaigns: campaigns.length,
      });

      // Build recent activity from latest call logs
      const activityItems: ActivityItem[] = calls.slice(0, 8).map((cl: any) => {
        const name = [cl.first_name, cl.last_name].filter(Boolean).join(" ") || cl.phone_number_called || "Unknown";
        const statusLabel = cl.status?.toUpperCase() === "ANSWERED"
          ? "answered" : cl.status?.toLowerCase() ?? "pending";
        return {
          id: cl.id,
          action: `Call to ${name} — ${statusLabel}`,
          time: timeAgo(cl.created_at),
          status: mapCallStatus(cl.status),
          phone: cl.phone_number_called,
          campaign: cl.campaign_name,
        };
      });

      setActivity(activityItems);
    } catch (err) {
      console.error("fetchDashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.org_id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statCards = [
    {
      label: "Total Contacts",
      value: stats.totalContacts.toLocaleString(),
      icon: Users,
    },
    {
      label: "Active Campaigns",
      value: stats.activeCampaigns.toString(),
      icon: Megaphone,
    },
    {
      label: "Calls Today",
      value: stats.callsToday.toLocaleString(),
      icon: PhoneCall,
    },
    {
      label: "Total Campaigns",
      value: stats.totalCampaigns.toLocaleString(),
      icon: TrendingUp,
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-150"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-accent" />
                  <span className="text-xs text-muted-foreground ml-1">live data</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Call Activity</h3>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activity.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No call activity yet. Launch a campaign to get started.
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge variant={item.status}>
                      {item.status}
                    </StatusBadge>
                    <div>
                      <span className="text-sm">{item.action}</span>
                      {item.campaign && (
                        <p className="text-xs text-muted-foreground">{item.campaign}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Index;