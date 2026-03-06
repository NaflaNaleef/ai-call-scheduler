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
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall, Search, Calendar, Mic, User, Megaphone,
  Hash, Clock, Loader2, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface CallLog {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignRunId: string | null;
  contactId: string | null;
  contactName: string;
  phone: string;
  status: string;
  attemptNumber: number;
  callDuration: number | null;
  collectedData: Record<string, any> | null;
  transcriptText: string | null;
  transcriptJson: Array<{ id: number; text: string; user: string; created_at: string }> | null;
  recordingUrl: string | null;
  voicemailDetected: boolean;
  createdAt: string;
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

function mapStatus(status: string): "success" | "error" | "info" | "neutral" {
  switch (status?.toUpperCase()) {
    case "ANSWERED": return "success";
    case "FAILED":
    case "NO_ANSWER":
    case "BUSY":
    case "VOICEMAIL": return "error";
    case "PENDING": return "neutral";
    default: return "info";
  }
}

function statusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case "ANSWERED": return "answered";
    case "FAILED": return "failed";
    case "NO_ANSWER": return "no answer";
    case "BUSY": return "busy";
    case "VOICEMAIL": return "voicemail";
    case "PENDING": return "pending";
    default: return status?.toLowerCase() ?? "—";
  }
}

const PAGE_SIZE = 8;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CallLogsPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeLog, setActiveLog] = useState<CallLog | null>(null);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
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

  // ── Unique campaign names for filter ──────────────────────────────────────
  const campaignNames = Array.from(new Set(logs.map((l) => l.campaignName))).sort();

  // ── Filtering ─────────────────────────────────────────────────────────────
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
    setTranscriptExpanded(false);
    setDrawerOpen(true);
  }

  // ── Columns ───────────────────────────────────────────────────────────────
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
      render: (item: CallLog) => <span>{formatDuration(item.callDuration)}</span>,
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

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* ── CALL DETAIL DRAWER ────────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {activeLog && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="text-base">{activeLog.contactName}</SheetTitle>
                    <SheetDescription className="text-xs font-mono mt-0.5">
                      {activeLog.id.slice(0, 8)}...
                    </SheetDescription>
                  </div>
                  <StatusBadge variant={mapStatus(activeLog.status)}>
                    {statusLabel(activeLog.status)}
                  </StatusBadge>
                </div>
              </SheetHeader>

              <Separator />

              <div className="py-4 space-y-3">
                {/* Info Card */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{activeLog.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{activeLog.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Campaign</p>
                      <p className="text-sm font-medium">{activeLog.campaignName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Run ID</p>
                      <p className="text-sm font-mono">
                        {activeLog.campaignRunId ? activeLog.campaignRunId.slice(0, 8) + "..." : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Call Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Attempt</p>
                    <p className="text-lg font-semibold">#{activeLog.attemptNumber}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Duration
                    </p>
                    <p className="text-lg font-semibold">{formatDuration(activeLog.callDuration)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-sm font-medium">{formatDateTime(activeLog.createdAt)}</p>
                </div>

                {/* Voicemail badge */}
                {activeLog.voicemailDetected && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Voicemail detected</p>
                  </div>
                )}

                {/* Collected Data */}
                {activeLog.collectedData && Object.keys(activeLog.collectedData).length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collected Data</p>
                    {Object.entries(activeLog.collectedData).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start gap-2">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-xs font-medium text-right max-w-[60%] break-words">
                          {value === null ? "—" : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Recording & Transcript */}
              <div className="py-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  Recording & Transcript
                </h3>

                {/* Recording */}
                {activeLog.recordingUrl ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Call Recording</p>
                    <audio controls className="w-full h-8" src={activeLog.recordingUrl}>
                      Your browser does not support audio playback.
                    </audio>
                    <a
                      href={activeLog.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open recording
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">No recording available</p>
                  </div>
                )}

                {/* Transcript */}
                {activeLog.transcriptJson && activeLog.transcriptJson.length > 0 ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Transcript</p>
                      <button
                        onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {transcriptExpanded ? (
                          <><ChevronUp className="h-3 w-3" /> Collapse</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> Expand</>
                        )}
                      </button>
                    </div>

                    <div className={`space-y-2 ${transcriptExpanded ? "" : "max-h-48 overflow-hidden"}`}>
                      {activeLog.transcriptJson
                        .filter((t) => t.user !== "agent-action")
                        .map((t) => (
                          <div
                            key={t.id}
                            className={`flex gap-2 ${t.user === "assistant" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${t.user === "assistant"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                                }`}
                            >
                              <p className="font-medium mb-0.5 opacity-70 capitalize">{t.user}</p>
                              <p>{t.text}</p>
                            </div>
                          </div>
                        ))}
                    </div>

                    {!transcriptExpanded && activeLog.transcriptJson.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {activeLog.transcriptJson.length} messages — click Expand to see all
                      </p>
                    )}
                  </div>
                ) : activeLog.transcriptText ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Transcript</p>
                    <div className={`text-xs text-foreground whitespace-pre-wrap leading-relaxed ${transcriptExpanded ? "" : "max-h-48 overflow-hidden"}`}>
                      {activeLog.transcriptText}
                    </div>
                    <button
                      onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {transcriptExpanded ? <><ChevronUp className="h-3 w-3" />Collapse</> : <><ChevronDown className="h-3 w-3" />Show more</>}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">No transcript available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}