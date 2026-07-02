import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
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
import { Play, Search, Phone, CheckCircle, XCircle, Clock, Timer, Loader2, RefreshCw, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { CallLog, CallLogDrawer } from "@/components/call-logs/CallLogDrawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

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
  attemptNumber: number;
  parentRunId: string | null;
}

interface CampaignContactRow {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  status: string; // PENDING | COMPLETED | SKIPPED
  startedCallingAt: string | null;
  stoppedCallingAt: string | null;
  attemptReached: number | null;
  totalAttempts: number;
  campaignRunId: string;
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

function mapRunStatus(status: string): "info" | "success" | "error" | "neutral" | "warning" {
  switch (status?.toUpperCase()) {
    case "RUNNING": return "info";
    case "SCHEDULED": return "info"; // Blue/indigo
    case "COMPLETED": return "success";
    case "FAILED": return "error";
    case "PAUSED": return "warning";
    case "BLOCKED": return "warning";
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

function getChainRunIds(rootRunId: string, allRuns: CampaignRun[]): string[] {
  const chainIds: string[] = [];
  function collect(id: string) {
    chainIds.push(id);
    allRuns.filter(r => r.parentRunId === id).forEach(r => collect(r.id));
  }
  collect(rootRunId);
  return chainIds;
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
  const location = useLocation();

  const isMinutesBlocked = (run: any) =>
    run.status?.toUpperCase() === 'BLOCKED';

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

  // Call log drawer
  const [callLogDrawerOpen, setCallLogDrawerOpen] = useState(false);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);

  // Retry logic
  const [retryLoading, setRetryLoading] = useState(false);
  const [retrySuccessRunId, setRetrySuccessRunId] = useState<string | null>(null);
  const [confirmRetryRun, setConfirmRetryRun] = useState<CampaignRun | null>(null);

  // Grouping
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Initialize expandedGroups for recurring campaigns
  useEffect(() => {
    if (runs.length > 0) {
      const recurringCampaignIds = new Set(
        runs
          .filter(r => r.scheduleType === 'recurring')
          .map(r => r.campaignId)
      );
      setExpandedGroups(recurringCampaignIds);
    }
  }, [runs.length]);

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
        attemptNumber: r.attempt_number ?? 1,
        parentRunId: r.parent_run_id,
      }));
      setRuns(mapped);
      return mapped; // Return for chain usage if needed
    } catch (e: any) {
      setError(e.message ?? "Failed to load campaign runs");
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.org_id]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  useEffect(() => {
    if (location.state?.openRunId && runs.length > 0) {
      const targetId = location.state.openRunId;
      const run = runs.find(r => r.id === targetId);
      if (run) {
        openDrawer(run);
        window.history.replaceState({}, document.title);
      }
    }
  }, [runs, location.state?.openRunId]);

  // ── Fetch campaign_contacts for drawer (source of truth during & after run) ─
  async function fetchCallLogs(runId: string, allRuns: CampaignRun[]) {
    if (!allRuns.length) return;
    setLogsLoading(true);
    setCallLogs([]);
    setAvgDuration(null);
    try {
      // 1. Find the root run of this chain
      let rootId = runId;
      let current = allRuns.find(r => r.id === rootId);
      while (current?.parentRunId) {
        rootId = current.parentRunId;
        current = allRuns.find(r => r.id === rootId);
      }

      // 2. Get all run IDs in this chain
      const chainRunIds = getChainRunIds(rootId, allRuns);
      const chainRuns = allRuns.filter(r => chainRunIds.includes(r.id));

      // 3. Fetch contacts from all runs in the chain
      const { data, error: err } = await supabase
        .from("campaign_contacts")
        .select("id, contact_id, phone_number, status, started_calling_at, stopped_calling_at, campaign_run_id, created_at, contacts(first_name, last_name)")
        .in("campaign_run_id", chainRunIds)
        .order("created_at", { ascending: true });

      if (err) throw err;

      // 4. De-duplicate contacts (COMPLETED wins, otherwise most recent)
      const bestRecords: Record<string, any> = {};
      (data ?? []).forEach((cc: any) => {
        const existing = bestRecords[cc.contact_id];
        if (!existing) {
          bestRecords[cc.contact_id] = cc;
        } else {
          const isBetter =
            cc.status === 'COMPLETED' ||
            (existing.status !== 'COMPLETED' && (new Date(cc.stopped_calling_at || cc.created_at).getTime() > new Date(existing.stopped_calling_at || existing.created_at).getTime()));

          if (isBetter) bestRecords[cc.contact_id] = cc;
        }
      });

      // 5. Map rows with chain metadata
      const rows: CampaignContactRow[] = Object.values(bestRecords).map((cc: any) => {
        const firstName = cc.contacts?.first_name ?? "";
        const lastName = cc.contacts?.last_name ?? "";
        const runInfo = chainRuns.find(r => r.id === cc.campaign_run_id);

        return {
          id: cc.id,
          contactId: cc.contact_id,
          contactName: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
          phone: cc.phone_number ?? "—",
          status: cc.status ?? "PENDING",
          startedCallingAt: cc.started_calling_at,
          stoppedCallingAt: cc.stopped_calling_at,
          campaignRunId: cc.campaign_run_id,
          attemptReached: cc.status === 'COMPLETED' ? (runInfo?.attemptNumber ?? null) : null,
          totalAttempts: chainRunIds.length
        };
      });

      rows.sort((a, b) => {
        if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return -1;
        if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return 1;
        if (a.status === 'COMPLETED' && b.status === 'COMPLETED') {
          return (a.attemptReached ?? 1) - (b.attemptReached ?? 1);
        }
        return 0;
      });

      setCallLogs(rows);

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

    fetchCallLogs(activeRun.id, runs);

    const channel = supabase
      .channel(`campaign_contacts_${activeRun.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_contacts',
          filter: `campaign_run_id=eq.${activeRun.id}`,
        },
        () => {
          fetchCallLogs(activeRun.id, runs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRun?.id, runs]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const baseRuns = runs.filter(r => r.parentRunId === null);
  const filtered = baseRuns.filter((r) => {
    const matchSearch =
      r.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status?.toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  // Grouping and Sorting logic
  const groupedItems = (() => {
    const groups: Record<string, CampaignRun[]> = {};
    const flatRuns: CampaignRun[] = [];

    const campaignRunCounts: Record<string, number> = {};
    filtered.forEach(run => {
      campaignRunCounts[run.campaignId] = (campaignRunCounts[run.campaignId] || 0) + 1;
    });

    filtered.forEach(run => {
      if (run.scheduleType === 'recurring') {
        if (!groups[run.campaignId]) groups[run.campaignId] = [];
        groups[run.campaignId].push(run);
      } else {
        flatRuns.push(run);
      }
    });

    const topLevel: any[] = [
      ...flatRuns.map(r => ({
        type: 'flat',
        data: r,
        date: r.startedAt || r.scheduledAt || '0'
      })),
      ...Object.entries(groups).map(([id, runs]) => {
        const sortedRuns = [...runs].sort((a, b) => {
          const dateA = new Date(a.startedAt || a.scheduledAt || 0).getTime();
          const dateB = new Date(b.startedAt || b.scheduledAt || 0).getTime();
          return dateB - dateA;
        });

        // Derive overall status: if any run is RUNNING, group is RUNNING.
        // Else check if latest is SCHEDULED.
        let groupStatus = sortedRuns[0].status;
        if (sortedRuns.some(r => r.status === 'RUNNING')) {
          groupStatus = 'RUNNING';
        } else if (sortedRuns[0].status === 'SCHEDULED') {
          groupStatus = 'SCHEDULED';
        }

        return {
          type: 'group',
          campaignId: id,
          campaignName: sortedRuns[0].campaignName,
          status: groupStatus,
          runs: sortedRuns,
          count: sortedRuns.length,
          date: sortedRuns[0].startedAt || sortedRuns[0].scheduledAt || '0',
        };
      })
    ];

    return topLevel.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  })();

  const totalGroupedPages = Math.max(1, Math.ceil(groupedItems.length / PAGE_SIZE));
  const paginatedGroups = groupedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Flatten for display
  const displayRows: any[] = [];
  paginatedGroups.forEach(item => {
    if (item.type === 'flat') {
      displayRows.push({ ...item, key: item.data.id });
    } else {
      displayRows.push({ ...item, key: `group-${item.campaignId}` });
      if (expandedGroups.has(item.campaignId)) {
        item.runs.forEach((run: any, index: number) => {
          displayRows.push({
            type: 'child',
            data: run,
            key: run.id,
            runNumber: item.count - index, // #1 is oldest, assuming item.runs is newest-to-oldest
            campaignId: item.campaignId
          });
        });
      }
    }
  });

  const toggleGroup = (campaignId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  };

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

  async function openCallLogDrawer(contactRow: CampaignContactRow) {
    if (contactRow.status.toUpperCase() !== "COMPLETED" || !activeRun) return;
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*, contacts(first_name, last_name), campaigns(name)")
        .eq("campaign_run_id", contactRow.campaignRunId)
        .eq("contact_id", contactRow.contactId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return;
      const log: CallLog = {
        id: data.id,
        campaignId: data.campaign_id,
        campaignName: data.campaigns?.name ?? activeRun.campaignName,
        campaignRunId: data.campaign_run_id,
        contactId: data.contact_id,
        contactName: [data.contacts?.first_name, data.contacts?.last_name].filter(Boolean).join(" ") || contactRow.contactName,
        phone: data.phone_number_called ?? contactRow.phone,
        status: data.status ?? "PENDING",
        attemptNumber: data.attempt_number ?? 1,
        callDuration: data.call_duration,
        collectedData: data.collected_data,
        transcriptText: data.transcript_text,
        transcriptJson: data.transcript_json,
        recordingUrl: data.recording_url,
        voicemailDetected: data.voicemail_detected ?? false,
        createdAt: data.created_at,
      };
      setSelectedCallLog(log);
      setCallLogDrawerOpen(true);
    } catch (err) {
      console.error("Failed to fetch call log:", err);
    }
  }

  function openDrawer(run: CampaignRun) {
    // Find the latest run in this run's chain
    const chainIds = getChainRunIds(run.id, runs);
    const chainRuns = runs.filter(r => chainIds.includes(r.id));
    const latestRun = chainRuns.sort((a, b) =>
      b.attemptNumber - a.attemptNumber)[0] ?? run;

    setActiveRun(latestRun); // ← always set to latest
    setDrawerSearch("");
    setDrawerStatusFilter("all");
    setDrawerPage(1);
    setRetrySuccessRunId(null);
    setDrawerOpen(true);
  }

  async function handleRetryConfirmed() {
    if (!confirmRetryRun) return;
    setRetryLoading(true);
    try {
      const { data, error } = await supabase.rpc('f_create_retry_run', {
        p_campaign_run_id: confirmRetryRun.id
      });
      if (error) throw error;

      const latestRuns = await fetchRuns();
      setRetrySuccessRunId(data);
      setConfirmRetryRun(null);

      // Open the new run
      const newRun = latestRuns.find(r => r.id === data);
      if (newRun) {
        openDrawer(newRun);
      }
    } catch (e: any) {
      console.error("Retry failed:", e);
    } finally {
      setRetryLoading(false);
    }
  }


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
        <div className="flex flex-col">
          <StatusBadge variant={mapContactStatus(item.status)}>{contactStatusLabel(item.status)}</StatusBadge>
          {item.status.toUpperCase() === 'COMPLETED' && (item.attemptReached ?? 0) > 1 && (
            <span className="text-[10px] text-muted-foreground mt-0.5 ml-1 italic">
              via retry {item.attemptReached}
            </span>
          )}
          {item.status.toUpperCase() !== 'COMPLETED' && item.totalAttempts > 1 && (
            <span className="text-[10px] text-muted-foreground mt-0.5 ml-1 italic">
              tried {item.totalAttempts}x
            </span>
          )}
        </div>
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
    {
      key: "actions",
      header: "",
      render: (item: CampaignContactRow) =>
        item.status.toUpperCase() === "COMPLETED" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:text-primary"
            onClick={(e) => { e.stopPropagation(); openCallLogDrawer(item); }}
          >
            View Log
          </Button>
        ) : null,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={fetchRuns}
              disabled={loading}
              title="Refresh Runs"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Loading / Error / Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive text-center py-8">{error}</div>
          ) : displayRows.length === 0 ? (
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
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Run ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Started At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Success</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayRows.map((row) => {
                      if (row.type === 'flat' || row.type === 'child') {
                        const item = row.data as CampaignRun;
                        const isChild = row.type === 'child';

                        // For flat rows, show the status/date of the latest run in the chain
                        let displayStatus = item.status;
                        let displayStartedAt = item.startedAt;

                        if (row.type === 'flat') {
                          const chainIds = getChainRunIds(item.id, runs);
                          const latestRun = runs.filter(r => chainIds.includes(r.id)).sort((a, b) => b.attemptNumber - a.attemptNumber)[0] || item;
                          displayStatus = latestRun.status;
                          displayStartedAt = latestRun.startedAt;
                        }

                        return (
                          <tr
                            key={row.key}
                            onClick={() => openDrawer(item)}
                            className={cn(
                              "group transition-colors duration-150 cursor-pointer hover:bg-muted/50",
                              isChild && "bg-muted/10 border-l-2 border-primary/20",
                              isChild && (item.status.toUpperCase() === 'PAUSED' || item.parentRunId) && "opacity-60"
                            )}
                          >
                            <td className={cn("px-4 py-3 font-mono text-xs text-muted-foreground", isChild && "pl-8", isChild && item.parentRunId && "pl-12")}>
                              {isChild ? (
                                item.parentRunId ? (
                                  <span className="opacity-70">↳ Retry {item.attemptNumber}</span>
                                ) : (
                                  `#${row.runNumber}`
                                )
                              ) : (
                                `${item.id.slice(0, 8)}...`
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {isChild ? (
                                <span className="text-muted-foreground flex items-center gap-1.5 grayscale opacity-70">
                                  <Layers className="h-3 w-3" /> {item.campaignName}
                                </span>
                              ) : (
                                item.campaignName
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge variant={mapRunStatus(displayStatus)}>{displayStatus.toLowerCase()}</StatusBadge>
                              {isMinutesBlocked(item) && (
                                <div className="mt-1 text-[11px] text-warning leading-tight max-w-[200px]">
                                  Call minutes limit reached.{' '}
                                  {item.scheduleType === 'recurring'
                                    ? 'Will resume after upgrading.'
                                    : 'Upgrade your plan to relaunch.'}
                                </div>
                              )}
                            </td>
                            {isChild && item.status.toUpperCase() === 'PAUSED' ? (
                              <td colSpan={2} className="px-4 py-3 text-muted-foreground italic text-xs">
                                Suspended before running
                              </td>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(displayStartedAt)}</td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(item.completedAt)}</td>
                              </>
                            )}
                            <td className="px-4 py-3 tabular-nums font-medium">{item.totalContacts}</td>
                            <td className="px-4 py-3 tabular-nums text-accent font-medium">{item.callsCompleted}</td>
                            <td className="px-4 py-3 tabular-nums text-destructive font-medium">{item.callsFailed}</td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); openDrawer(item); }}>
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      } else if (row.type === 'group') {
                        const expanded = expandedGroups.has(row.campaignId);
                        const lastCompleted = row.runs.find((r: any) => r.status === 'COMPLETED');
                        const nextScheduled = row.runs.find((r: any) => r.status === 'SCHEDULED' && r.scheduledAt);
                        const activityLabel = lastCompleted
                          ? `Last run: ${formatDateTime(lastCompleted.startedAt)}`
                          : nextScheduled
                            ? `Next run: ${formatDateTime(nextScheduled.scheduledAt)}`
                            : 'Pending';

                        return (
                          <tr
                            key={row.key}
                            onClick={() => toggleGroup(row.campaignId)}
                            className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Multiple</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold flex items-center gap-2">
                              {row.campaignName}
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-tighter">
                                <Clock className="h-2.5 w-2.5" /> Recurring
                              </span>
                              <span className="text-[11px] font-medium text-muted-foreground ml-1">({row.count} runs)</span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge variant={mapRunStatus(row.status)}>{row.status.toLowerCase()}</StatusBadge>
                            </td>
                            <td colSpan={5} className="px-4 py-3 text-xs text-muted-foreground italic">
                              {activityLabel}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-[10px] font-bold uppercase text-primary/60 tracking-widest">{expanded ? 'Collapse' : 'Expand'}</div>
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalPages={totalGroupedPages} onPageChange={setPage} />
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
                      <div className="flex items-center">
                        <SheetTitle className="text-base font-mono">{activeRun.id.slice(0, 8)}...</SheetTitle>
                        {(() => {
                          let rootId = activeRun.id;
                          let current = runs.find(r => r.id === rootId);
                          while (current?.parentRunId) {
                            rootId = current.parentRunId;
                            current = runs.find(r => r.id === rootId);
                          }
                          const chainIds = getChainRunIds(rootId, runs);
                          return chainIds.length > 1 ? (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-2 text-muted-foreground whitespace-nowrap">
                              {chainIds.length} attempts made
                            </span>
                          ) : (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-2 text-muted-foreground whitespace-nowrap">
                              Attempt 1 of 3
                            </span>
                          );
                        })()}
                      </div>
                      <SheetDescription className="mt-0.5 text-sm font-medium text-foreground">
                        {activeRun.campaignName}
                      </SheetDescription>
                    </div>
                    <div className="flex flex-col items-end">
                      <StatusBadge variant={mapRunStatus(activeRun.status)}>
                        {activeRun.status.toLowerCase()}
                      </StatusBadge>
                      {isMinutesBlocked(activeRun) && (
                        <div className="mt-1 text-xs text-warning text-right max-w-[200px]">
                          Call minutes limit reached.{' '}
                          {activeRun.scheduleType === 'recurring'
                            ? 'Will resume automatically after upgrading.'
                            : 'Upgrade your plan to relaunch this campaign.'}
                          {' '}
                          <Link to="/subscriptions" className="underline font-medium">
                            Manage plan →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetHeader>

                <Separator className="shrink-0" />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 shrink-0">
                  {[
                    {
                      label: "Total Contacts",
                      value: callLogs.length || activeRun.totalContacts,
                      icon: Phone,
                      color: "text-foreground"
                    },
                    {
                      label: "Connected",
                      value: callLogs.filter(l => l.status === 'COMPLETED').length,
                      icon: CheckCircle,
                      color: "text-accent"
                    },
                    {
                      label: "Not Reached",
                      value: callLogs.filter(l => l.status !== 'COMPLETED').length,
                      icon: XCircle,
                      color: "text-destructive"
                    },
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

                {/* Retry Run logic */}
                {(() => {
                  let rootId = activeRun.id;
                  let curr = runs.find(r => r.id === rootId);
                  while (curr?.parentRunId) {
                    rootId = curr.parentRunId;
                    curr = runs.find(r => r.id === rootId);
                  }
                  const chainIds = getChainRunIds(rootId, runs);
                  const latestRunInChain = runs.filter(r => chainIds.includes(r.id)).sort((a, b) => b.attemptNumber - a.attemptNumber)[0];

                  const unreachedCount = callLogs.filter(l => l.status !== 'COMPLETED').length;
                  const retryAlreadyExists = runs.some(r => r.parentRunId === latestRunInChain?.id);
                  const canRetry = (latestRunInChain?.attemptNumber ?? 1) < 3;
                  const hasProgress = latestRunInChain?.status === 'COMPLETED' || callLogs.some(l => l.status === 'COMPLETED');

                  if (canRetry && unreachedCount > 0 && !retryAlreadyExists && hasProgress) {
                    return (
                      <div className="pb-4">
                        <Button
                          variant="outline"
                          className="w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400 gap-2"
                          onClick={() => setConfirmRetryRun(latestRunInChain)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry Unreached Calls ({unreachedCount})
                        </Button>
                      </div>
                    );
                  }

                  if (retryAlreadyExists && latestRunInChain?.status === 'RUNNING') {
                    return (
                      <div className="pb-4 text-center">
                        <p className="text-sm text-muted-foreground italic">
                          Retry {latestRunInChain.attemptNumber} of 3 in progress...
                        </p>
                      </div>
                    );
                  }

                  if (!canRetry && unreachedCount > 0) {
                    return (
                      <div className="pb-4 text-center">
                        <p className="text-sm text-destructive font-medium italic">
                          {unreachedCount} contact(s) could not be reached after 3 attempts
                        </p>
                      </div>
                    );
                  }

                  return null;
                })()}

                <Separator className="my-4 shrink-0" />

                {/* Contact Execution Log */}
                <div className="space-y-3 flex-1 min-h-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Contact Execution Log</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => activeRun?.id && fetchCallLogs(activeRun.id, runs)}
                      disabled={logsLoading}
                      title="Refresh Log"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", logsLoading && "animate-spin")} />
                    </Button>
                  </div>

                  {activeRun.status === 'SCHEDULED' ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 text-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-lg text-primary">Campaign Scheduled</p>
                        <p className="text-sm text-muted-foreground">
                          {activeRun.scheduledAt
                            ? `Calls will start on ${new Date(activeRun.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(activeRun.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
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
                            onRowClick={(item) => openCallLogDrawer(item)}
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

      <CallLogDrawer
        log={selectedCallLog}
        open={callLogDrawerOpen}
        onClose={() => setCallLogDrawerOpen(false)}
      />

      <Dialog open={!!confirmRetryRun} onOpenChange={(open) => !open && setConfirmRetryRun(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry Unreached Calls</DialogTitle>
            <DialogDescription>
              A new run will be created for {callLogs.filter(l => l.status !== 'COMPLETED').length} contacts who were not successfully reached. This will be attempt {confirmRetryRun ? confirmRetryRun.attemptNumber + 1 : 0} of 3.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRetryRun(null)} disabled={retryLoading}>
              Cancel
            </Button>
            <Button onClick={handleRetryConfirmed} disabled={retryLoading} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              {retryLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}