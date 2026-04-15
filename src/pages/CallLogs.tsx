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
import { PhoneCall, Search, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  CallLog, CallLogDrawer,
  mapStatus, statusLabel, formatDateTime,
} from "@/components/call-logs/CallLogDrawer";

const PAGE_SIZE = 8;

export default function CallLogsPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeLog, setActiveLog] = useState<CallLog | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user?.org_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("f_get_org_call_logs", {
        p_org_id: user.org_id,
        p_limit: 500,
        p_offset: 0,
      });
      if (err) throw err;
      const mapped: CallLog[] = (data ?? []).map((cl: any) => ({
        id: cl.id,
        campaignId: cl.campaign_id,
        campaignName: cl.campaign_name ?? "—",
        campaignRunId: cl.campaign_run_id,
        contactId: cl.contact_id,
        contactName: [cl.first_name, cl.last_name].filter(Boolean).join(" ") || "Unknown",
        phone: cl.phone_number_called ?? "—",
        status: cl.status ?? "PENDING",
        attemptNumber: cl.attempt_number ?? 1,
        callDuration: cl.call_duration,
        collectedData: cl.collected_data,
        transcriptText: cl.transcript_text,
        transcriptJson: cl.transcript_json,
        recordingUrl: cl.recording_url,
        voicemailDetected: cl.voicemail_detected ?? false,
        createdAt: cl.created_at,
      }));
      setLogs(mapped);
    } catch (e: any) {
      setError(e.message ?? "Failed to load call logs");
    } finally {
      setLoading(false);
    }
  }, [user?.org_id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const campaignNames = Array.from(new Set(logs.map((l) => l.campaignName))).sort();

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.contactName.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search);
    const matchCampaign = campaignFilter === "all" || l.campaignName === campaignFilter;
    const matchStatus = statusFilter === "all" || l.status?.toUpperCase() === statusFilter;
    return matchSearch && matchCampaign && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openDrawer(log: CallLog) {
    setActiveLog(log);
    setDrawerOpen(true);
  }

  const columns = [
    {
      key: "contact",
      header: "Contact",
      render: (item: CallLog) => (
        <div>
          <p className="font-medium text-sm">{item.contactName}</p>
          <p className="text-xs text-muted-foreground">{item.phone}</p>
        </div>
      ),
    },
    { key: "campaignName", header: "Campaign" },
    {
      key: "campaignRunId",
      header: "Run ID",
      render: (item: CallLog) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.campaignRunId ? item.campaignRunId.slice(0, 8) + "..." : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: CallLog) => (
        <StatusBadge variant={mapStatus(item.status)}>{statusLabel(item.status)}</StatusBadge>
      ),
    },
    {
      key: "attemptNumber",
      header: "Attempt",
      render: (item: CallLog) => (
        <span className="tabular-nums text-sm">#{item.attemptNumber}</span>
      ),
    },
    {
      key: "callDuration",
      header: "Duration",
      render: (item: CallLog) => <span>{item.callDuration ? `${Math.floor(item.callDuration/60)}:${String(item.callDuration%60).padStart(2,"0")}` : "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (item: CallLog) => <span>{formatDateTime(item.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (item: CallLog) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openDrawer(item)}>
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Call Logs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Review all individual call attempts across every campaign run.
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by contact or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignNames.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ANSWERED">Answered</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="NO_ANSWER">No Answer</SelectItem>
              <SelectItem value="BUSY">Busy</SelectItem>
              <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh Logs"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive text-center py-8">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<PhoneCall className="h-6 w-6" />}
            title="No call logs found"
            description={
              search || campaignFilter !== "all" || statusFilter !== "all"
                ? "Adjust your filters to find the calls you're looking for."
                : "Call history is recorded automatically as campaigns run."
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(l) => l.id}
              onRowClick={openDrawer}
            />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      <CallLogDrawer
        log={activeLog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </DashboardLayout>
  );
}