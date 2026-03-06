import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Play, Search, Phone, CheckCircle, XCircle, Clock, Timer, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface CampaignRun {
  id: string;
  campaignId: string;
  campaignName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  totalContacts: number;
  callsCompleted: number;
  callsFailed: number;
  callsPending: number;
  scheduleType?: string;
  scheduledAt?: string | null;
  callStartTime?: string;
  callEndTime?: string;
  daysOfWeek?: string[];
}

interface CampaignContactRow {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  status: string; // PENDING | COMPLETED | SKIPPED
  startedCallingAt: string | null;
  stoppedCallingAt: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function mapRunStatus(status: string): "info" | "success" | "error" | "neutral" {
  switch (status?.toUpperCase()) {
    case "RUNNING": return "info";
    case "SCHEDULED": return "info"; // Blue/indigo
    case "COMPLETED": return "success";
    case "FAILED": return "error";
    default: return "neutral";
  }
}

function mapContactStatus(status: string): "success" | "error" | "info" | "neutral" {
  switch (status?.toUpperCase()) {
    case "COMPLETED": return "success";
    case "SKIPPED": return "error";
    case "PENDING": return "neutral";
    default: return "info";
  }
}

function contactStatusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case "COMPLETED": return "completed";
    case "SKIPPED": return "skipped";
    case "PENDING": return "pending";
    default: return status?.toLowerCase() ?? "—";
  }
}

const PAGE_SIZE = 5;
const DRAWER_PAGE_SIZE = 5;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignRunsPage() {
  const { user } = useAuth();

  const [runs, setRuns] = useState<CampaignRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRun, setActiveRun] = useState<CampaignRun | null>(null);
  const [callLogs, setCallLogs] = useState<CampaignContactRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerStatusFilter, setDrawerStatusFilter] = useState("all");
  const [drawerPage, setDrawerPage] = useState(1);

  // ── Fetch runs ────────────────────────────────────────────────────────────
  const fetchRuns = useCallback(async () => {
    if (!user?.org_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("f_get_org_campaign_runs", {
        p_org_id: user.org_id,
      });
      if (err) throw err;
      const mapped: CampaignRun[] = (data ?? []).map((r: any) => ({
        id: r.id,
        campaignId: r.campaign_id,
        campaignName: r.campaign_name,
        status: r.status ?? "DRAFT",
        startedAt: r.started_at,
        completedAt: r.completed_at,
        totalContacts: r.total_contacts ?? 0,
        callsCompleted: r.calls_completed ?? 0,
        callsFailed: r.calls_failed ?? 0,
        callsPending: r.calls_pending ?? 0,
        scheduleType: r.schedule_type,
        scheduledAt: r.scheduled_at,
        callStartTime: r.call_start_time,
        callEndTime: r.call_end_time,
        daysOfWeek: r.days_of_week,
      }));
      setRuns(mapped);
    } catch (e: any) {
      setError(e.message ?? "Failed to load campaign runs");
    } finally {
      setLoading(false);
    }
  }, [user?.org_id]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // ── Fetch campaign_contacts for drawer (source of truth during & after run) ─
  async function fetchCallLogs(runId: string) {
    setLogsLoading(true);
    setCallLogs([]);
    setAvgDuration(null);
    try {
      const { data, error: err } = await supabase
        .from("campaign_contacts")
        .select("id, contact_id, phone_number, status, started_calling_at, stopped_calling_at, contacts(first_name, last_name)")
        .eq("campaign_run_id", runId)
        .order("created_at", { ascending: true });

      if (err) throw err;

      const rows: CampaignContactRow[] = (data ?? []).map((cc: any) => {
        const firstName = cc.contacts?.first_name ?? "";
        const lastName = cc.contacts?.last_name ?? "";
        return {
          id: cc.id,
          contactId: cc.contact_id,
          contactName: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
          phone: cc.phone_number ?? "—",
          status: cc.status ?? "PENDING",
          startedCallingAt: cc.started_calling_at,
          stoppedCallingAt: cc.stopped_calling_at,
        };
      });
      setCallLogs(rows);

      // Avg duration from started/stopped timestamps
      const durations = rows
        .filter(r => r.startedCallingAt && r.stoppedCallingAt)
        .map(r => Math.round((new Date(r.stoppedCallingAt!).getTime() - new Date(r.startedCallingAt!).getTime()) / 1000))
        .filter(d => d > 0);
      if (durations.length > 0) {
        setAvgDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length));
      }
    } catch (e: any) {
      console.error("Error fetching campaign contacts:", e);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    if (!activeRun?.id) return;

    // Initial fetch
    fetchCallLogs(activeRun.id);

    // Real-time subscription on campaign_contacts for this run
    const channel = supabase
      .channel(`campaign_contacts_${activeRun.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'campaign_contacts',
          filter: `campaign_run_id=eq.${activeRun.id}`,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchCallLogs(activeRun.id); // re-fetch on any change
        }
      )
      .subscribe();

    // Cleanup on drawer close or run change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRun?.id]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = runs.filter((r) => {
    const matchSearch =
      r.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status?.toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Drawer filtering ──────────────────────────────────────────────────────
  const filteredLogs = callLogs.filter((l) => {
    const matchSearch =
      l.contactName.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      l.phone.includes(drawerSearch);
    const matchStatus = drawerStatusFilter === "all" ||
      mapContactStatus(l.status) === drawerStatusFilter;
    return matchSearch && matchStatus;
  });
  const drawerTotalPages = Math.max(1, Math.ceil(filteredLogs.length / DRAWER_PAGE_SIZE));
  const drawerPaginated = filteredLogs.slice((drawerPage - 1) * DRAWER_PAGE_SIZE, drawerPage * DRAWER_PAGE_SIZE);

  function openDrawer(run: CampaignRun) {
    setActiveRun(run);
    setDrawerSearch("");
    setDrawerStatusFilter("all");
    setDrawerPage(1);
    setDrawerOpen(true);
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "id",
      header: "Run ID",
      render: (item: CampaignRun) => (
        <span className="font-mono text-xs text-muted-foreground">{item.id.slice(0, 8)}...</span>
      ),
    },
    { key: "campaignName", header: "Campaign Name" },
    {
      key: "status",
      header: "Status",
      render: (item: CampaignRun) => (
        <StatusBadge variant={mapRunStatus(item.status)}>{item.status.toLowerCase()}</StatusBadge>
      ),
    },
    {
      key: "startedAt",
      header: "Started At",
      render: (item: CampaignRun) => <span>{formatDateTime(item.startedAt)}</span>,
    },
    {
      key: "completedAt",
      header: "Completed At",
      render: (item: CampaignRun) => <span>{formatDateTime(item.completedAt)}</span>,
    },
    {
      key: "totalContacts",
      header: "Total",
      render: (item: CampaignRun) => (
        <span className="tabular-nums font-medium">{item.totalContacts}</span>
      ),
    },
    {
      key: "callsCompleted",
      header: "Success",
      render: (item: CampaignRun) => (
        <span className="tabular-nums text-accent font-medium">{item.callsCompleted}</span>
      ),
    },
    {
      key: "callsFailed",
      header: "Failed",
      render: (item: CampaignRun) => (
        <span className="tabular-nums text-destructive font-medium">{item.callsFailed}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: CampaignRun) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openDrawer(item)}>
            View Details
          </Button>
        </div>
      ),
    },
  ];

  const execColumns = [
    {
      key: "contactName",
      header: "Contact",
      render: (item: CampaignContactRow) => (
        <div>
          <p className="font-medium text-sm">{item.contactName}</p>
          <p className="text-xs text-muted-foreground">{item.phone}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: CampaignContactRow) => (
        <StatusBadge variant={mapContactStatus(item.status)}>{contactStatusLabel(item.status)}</StatusBadge>
      ),
    },
    {
      key: "startedCallingAt",
      header: "Called At",
      render: (item: CampaignContactRow) => (
        <span className="text-xs text-muted-foreground">
          {item.startedCallingAt ? formatDateTime(item.startedCallingAt) : "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (item: CampaignContactRow) => {
        if (!item.startedCallingAt || !item.stoppedCallingAt) return <span>—</span>;
        const secs = Math.round(
          (new Date(item.stoppedCallingAt).getTime() - new Date(item.startedCallingAt).getTime()) / 1000
        );
        return <span>{formatDuration(secs)}</span>;
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Campaign Runs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          View execution history of your campaigns. Runs are generated automatically when a campaign is launched.
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by campaign or run ID..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading / Error / Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive text-center py-8">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Play className="h-6 w-6" />}
            title="No runs found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Campaign runs are created automatically when you launch a campaign."
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(r) => r.id}
              onRowClick={openDrawer}
            />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── RUN DETAIL DRAWER ─────────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto flex flex-col">
          {activeRun && (
            <>
              <SheetHeader className="pb-4 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="text-base font-mono">{activeRun.id.slice(0, 8)}...</SheetTitle>
                    <SheetDescription className="mt-0.5 text-sm font-medium text-foreground">
                      {activeRun.campaignName}
                    </SheetDescription>
                  </div>
                  <StatusBadge variant={mapRunStatus(activeRun.status)}>
                    {activeRun.status.toLowerCase()}
                  </StatusBadge>
                </div>
              </SheetHeader>

              <Separator className="shrink-0" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 shrink-0">
                {[
                  { label: "Total Contacts", value: activeRun.totalContacts, icon: Phone, color: "text-foreground" },
                  { label: "Successful", value: activeRun.callsCompleted, icon: CheckCircle, color: "text-accent" },
                  { label: "Failed", value: activeRun.callsFailed, icon: XCircle, color: "text-destructive" },
                  { label: "Pending", value: activeRun.callsPending, icon: Clock, color: "text-info" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                    <p className={`text-xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Avg Duration */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 text-sm shrink-0">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Avg. Duration:</span>
                <span className="font-medium">
                  {logsLoading ? "..." : formatDuration(avgDuration)}
                </span>
              </div>

              <Separator className="my-4 shrink-0" />

              {/* Contact Execution Log */}
              <div className="space-y-3 flex-1 min-h-0">
                <h3 className="text-sm font-semibold">Contact Execution Log</h3>

                {activeRun.status === 'SCHEDULED' ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-primary">Campaign Scheduled</p>
                      <p className="text-sm text-muted-foreground">
                        {activeRun.scheduledAt
                          ? `Calls will start on ${new Date(activeRun.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(activeRun.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : `Will run on next active day between ${activeRun.callStartTime || '09:00'}–${activeRun.callEndTime || '18:00'}`
                        }
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground mt-4 italic">
                        Calls will appear here once the campaign starts
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search contacts..."
                          className="pl-8 h-8 text-xs"
                          value={drawerSearch}
                          onChange={(e) => { setDrawerSearch(e.target.value); setDrawerPage(1); }}
                        />
                      </div>
                      <Select value={drawerStatusFilter} onValueChange={(v) => { setDrawerStatusFilter(v); setDrawerPage(1); }}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="success">Completed</SelectItem>
                          <SelectItem value="error">Skipped</SelectItem>
                          <SelectItem value="neutral">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {logsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No contacts match the current filter.
                      </div>
                    ) : (
                      <>
                        <DataTable
                          columns={execColumns}
                          data={drawerPaginated}
                          keyExtractor={(e) => e.id}
                        />
                        <PaginationBar
                          page={drawerPage}
                          totalPages={drawerTotalPages}
                          onPageChange={setDrawerPage}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}