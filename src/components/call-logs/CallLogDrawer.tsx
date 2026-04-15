import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  PhoneCall, User, Megaphone, Hash, Clock,
  Mic, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

// ── Shared CallLog type ───────────────────────────────────────────────────────

export interface CallLog {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function mapStatus(status: string): "success" | "error" | "info" | "neutral" {
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

export function statusLabel(status: string): string {
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

// ── Component ─────────────────────────────────────────────────────────────────

interface CallLogDrawerProps {
  log: CallLog | null;
  open: boolean;
  onClose: () => void;
}

export function CallLogDrawer({ log, open, onClose }: CallLogDrawerProps) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  useEffect(() => {
    if (!open) setTranscriptExpanded(false);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {log && (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-base">{log.contactName}</SheetTitle>
                  <SheetDescription className="text-xs font-mono mt-0.5">
                    {log.id.slice(0, 8)}...
                  </SheetDescription>
                </div>
                <StatusBadge variant={mapStatus(log.status)}>
                  {statusLabel(log.status)}
                </StatusBadge>
              </div>
            </SheetHeader>

            <Separator />

            <div className="py-4 space-y-3">
              {/* Info Card */}
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Contact</Label>
                    <p className="text-sm font-medium">{log.contactName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Phone</Label>
                    <p className="text-sm font-medium tabular-nums">{log.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Campaign</Label>
                    <p className="text-sm font-medium">{log.campaignName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Run ID</Label>
                    <p className="text-sm font-mono opacity-80">
                      {log.campaignRunId ? log.campaignRunId.slice(0, 8) + "..." : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Call Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Attempt</Label>
                  <p className="text-lg font-semibold tabular-nums">#{log.attemptNumber}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Duration
                  </Label>
                  <p className="text-lg font-semibold tabular-nums">{formatDuration(log.callDuration)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">Timestamp</Label>
                <p className="text-sm font-medium tabular-nums">{formatDateTime(log.createdAt)}</p>
              </div>

              {/* Voicemail badge */}
              {log.voicemailDetected && (
                <div className="rounded-lg border border-yellow-200/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 border-l-4 border-l-yellow-400">
                  <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wide">Voicemail detected</p>
                </div>
              )}

              {/* Collected Data */}
              {log.collectedData && Object.keys(log.collectedData).length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-muted/50">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Collected Data
                    </Label>
                  </div>
                  <div className="divide-y divide-border/40">
                    {Object.entries(log.collectedData).map(([key, value]) => (
                      <div key={key} className="px-4 py-3 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                        <Label className="w-[110px] text-[10px] font-bold text-muted-foreground uppercase tracking-tight shrink-0 mt-0.5">
                          {key.replace(/_/g, " ")}
                        </Label>
                        <p className="flex-1 text-xs font-semibold leading-relaxed break-words opacity-90">
                          {value === null ? "—" : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Recording & Transcript */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                Recording &amp; Transcript
              </h3>

              {/* Recording */}
              {log.recordingUrl ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Call Recording</p>
                  <audio controls className="w-full h-8" src={log.recordingUrl}>
                    Your browser does not support audio playback.
                  </audio>
                  <a
                    href={log.recordingUrl}
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
              {log.transcriptJson && log.transcriptJson.length > 0 ? (
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
                    {log.transcriptJson
                      .filter((t) => t.user !== "agent-action")
                      .map((t) => (
                        <div
                          key={t.id}
                          className={`flex gap-2 ${t.user === "assistant" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
                              t.user === "assistant"
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

                  {!transcriptExpanded && log.transcriptJson.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {log.transcriptJson.length} messages — click Expand to see all
                    </p>
                  )}
                </div>
              ) : log.transcriptText ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Transcript</p>
                  <div className={`text-xs text-foreground whitespace-pre-wrap leading-relaxed ${transcriptExpanded ? "" : "max-h-48 overflow-hidden"}`}>
                    {log.transcriptText}
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
  );
}
