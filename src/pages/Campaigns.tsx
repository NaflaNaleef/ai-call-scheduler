import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Megaphone, Eye, Pencil, Copy, Trash2, Users,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, PlayCircle,
  FileEdit, X, Target, Rocket, AlertCircle, Database, ListPlus, ExternalLink,
  Lock,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description: string;
  greeting: string;
  instructions: string;
  status: "DRAFT" | "LOCKED" | "SCHEDULED";
  totalRecipients: number;
  startDate: string | null;
  createdAt: string;
  isActive: boolean;
  schedule_type?: "immediate" | "run_once" | "recurring";
  scheduled_start_at?: string | null;
  call_start_time?: string;
  call_end_time?: string;
  days_of_week?: string[];
}

interface CampaignField {
  id: string;
  campaignId: string;
  fieldName: string;
  fieldLabel: string;
  description: string;
  fieldType: "text" | "number" | "boolean" | "choice";
  isRequired: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_STATUSES = ["DRAFT", "LOCKED", "SCHEDULED"] as const;

const statusMeta: Record<
  Campaign["status"],
  { variant: "neutral" | "warning" | "info" | "success"; icon: React.ElementType; label: string }
> = {
  DRAFT: { variant: "neutral", icon: FileEdit, label: "Draft" },
  LOCKED: { variant: "warning", icon: Lock, label: "Locked" },
  SCHEDULED: { variant: "info", icon: Clock, label: "Scheduled" },
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  boolean: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  choice: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
};

// Reusable textarea class — matches exactly what the existing code uses
const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const PAGE_SIZE = 10;

// ── Targeting Summary Widget ──────────────────────────────────────────────────

// ── Targeting Panel ──────────────────────────────────────────────────────────

interface TargetingPanelProps {
  groups: any[];
  contacts: any[];
  selectedGroupIds: Set<string>;
  manualContactIds: Set<string>;
  excludedContactIds: Set<string>;
  groupMembers: Record<string, Set<string>>;
  onToggleGroup: (id: string, checked: boolean) => void;
  onToggleContact: (id: string, checked: boolean) => void;
  loading?: boolean;
}

const TargetingPanel = memo(({
  groups, contacts, selectedGroupIds, manualContactIds,
  excludedContactIds, groupMembers, onToggleGroup, onToggleContact, loading,
}: TargetingPanelProps) => {
  const [search, setSearch] = useState("");

  const filteredContacts = contacts.filter(c => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const s = search.toLowerCase();
    return name.includes(s) || email.includes(s);
  });

  return (
    <div className="grid grid-cols-[1fr_2.5fr] gap-3" style={{ height: '380px' }}>
      <div className="flex flex-col border rounded-lg bg-muted/30 overflow-hidden">
        <div className="p-2.5 border-b bg-muted/50 rounded-t-lg">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Groups
          </Label>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">Loading...</div>
          ) : (
            groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-background cursor-pointer transition-colors border border-transparent hover:border-border">
                <Checkbox checked={selectedGroupIds.has(String(g.id))} onCheckedChange={(c) => onToggleGroup(String(g.id), !!c)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{g.contact_count || 0} contacts</p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col border rounded-lg bg-muted/30 overflow-hidden">
        <div className="p-2 border-b bg-muted/50 rounded-t-lg flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="h-8 pl-8 text-xs bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
            {contacts.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground italic">No contacts found.</div>
          ) : (
            filteredContacts.map((c) => {
              const cid = String(c.id ?? c.contact_id);
              const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
              const inGroupSelection = Object.entries(groupMembers).some(([gid, members]) =>
                selectedGroupIds.has(gid) && members.has(cid)
              );
              const isManual = manualContactIds.has(cid);
              const isExcluded = excludedContactIds.has(cid);
              const isSelected = (inGroupSelection || isManual) && !isExcluded;
              const isViaGroup = isSelected && !isManual;

              return (
                <label key={cid} className={cn(
                  "flex items-center gap-2 p-2 rounded-md hover:bg-background cursor-pointer transition-colors border border-transparent hover:border-border",
                  isViaGroup && "bg-muted/60"
                )}>
                  <Checkbox checked={isSelected} onCheckedChange={(checked) => onToggleContact(cid, !!checked)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{fullName}</p>
                      {isViaGroup && <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">via group</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

function TargetingSummary({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Targeting Summary</span>
        </div>
        <span className="text-sm font-bold text-primary tabular-nums">
          Total selected: {selectedCount} contact{selectedCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

const RenderField = ({ label, value, id, onChange, isLocked }: {
  label: string; value: string; id: string;
  onChange: (v: string) => void; isLocked: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {isLocked ? (
      <div className="bg-muted/40 rounded-md border p-3 text-sm whitespace-pre-wrap min-h-[42px]">{value || "—"}</div>
    ) : label === "Campaign Name" ? (
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <textarea id={id} className={TEXTAREA_CLASS} value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

// ── Create Campaign Modal ─────────────────────────────────────────────────────

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  preselectedGroup?: string;
}

function CreateCampaignModal({ open, onClose, onCreate, preselectedGroup }: CreateCampaignModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set(preselectedGroup ? [preselectedGroup] : []));
  const [manualContactIds, setManualContactIds] = useState<Set<string>>(new Set());
  const [excludedContactIds, setExcludedContactIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, Set<string>>>({});
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const createRef = useRef(false);

  // Schedule state
  const [scheduleType, setScheduleType] = useState<"immediate" | "run_once" | "recurring">("immediate");
  const [scheduledStartAt, setScheduledStartAt] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState("09:00");
  const [callEndTime, setCallEndTime] = useState("18:00");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  // Field step state
  const [localFields, setLocalFields] = useState<any[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fName, setFName] = useState("");
  const [fLabel, setFLabel] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fType, setFType] = useState<"text" | "number" | "boolean" | "choice">("text");
  const [fRequired, setFRequired] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [fNameManuallyEdited, setFNameManuallyEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1); setName(""); setGreeting(""); setInstructions("");
      setSelectedGroupIds(new Set(preselectedGroup ? [preselectedGroup] : []));
      setManualContactIds(new Set()); setExcludedContactIds(new Set());
      setGroups([]); setContacts([]); setGroupMembers({});
      setLocalFields([]); setShowFieldForm(false); setEditingFieldIndex(null);
      setScheduleType("immediate"); setScheduledStartAt(null);
      setCallStartTime("09:00"); setCallEndTime("18:00");
      setDaysOfWeek(['MON', 'TUE', 'WED', 'THU', 'FRI']);
      createRef.current = false;
    }
  }, [open, preselectedGroup]);

  useEffect(() => {
    if (step === 2 && groups.length === 0) fetchTargetingData();
  }, [step]);

  async function fetchTargetingData() {
    if (!user?.org_id) return;
    setLoadingStep2(true);
    try {
      const [gs, cs] = await Promise.all([
        supabase.rpc("f_get_contact_groups", { p_org_id: user.org_id }),
        supabase.rpc("f_get_contacts", { p_org_id: user.org_id }),
      ]);
      setGroups(gs.data || []); setContacts(cs.data || []);
      if (preselectedGroup) handleToggleGroup(preselectedGroup, true);
    } catch (err) { console.error("fetchTargetingData:", err); }
    finally { setLoadingStep2(false); }
  }

  async function handleToggleGroup(groupId: string, checked: boolean) {
    setSelectedGroupIds(prev => { const n = new Set(prev); if (checked) n.add(String(groupId)); else n.delete(String(groupId)); return n; });
    if (checked) {
      if (groupMembers[groupId]) {
        // Clear exclusions for this group's members when group is checked
        setExcludedContactIds(prev => {
          const n = new Set(prev);
          groupMembers[groupId].forEach(id => n.delete(id));
          return n;
        });
      } else {
        const { data, error } = await supabase.rpc("f_get_group_contacts", { p_group_id: groupId });
        if (!error && data) {
          const ids = new Set<string>(); data.forEach((c: any) => ids.add(String(c.id ?? c.contact_id)));
          setGroupMembers(prev => ({ ...prev, [groupId]: ids }));
          setExcludedContactIds(prev => {
            const n = new Set(prev);
            ids.forEach(id => n.delete(id));
            return n;
          });
        }
      }
    }
  }

  function handleToggleContact(cid: string, checked: boolean) {
    const inGroupSelection = Object.entries(groupMembers).some(([gid, members]) =>
      selectedGroupIds.has(gid) && members.has(cid)
    );
    if (checked) {
      setManualContactIds(prev => { const n = new Set(prev); n.add(cid); return n; });
      setExcludedContactIds(prev => { const n = new Set(prev); n.delete(cid); return n; });
    } else {
      setManualContactIds(prev => { const n = new Set(prev); n.delete(cid); return n; });
      if (inGroupSelection) setExcludedContactIds(prev => { const n = new Set(prev); n.add(cid); return n; });
    }
  }

  const allSelectedContactIds = new Set<string>();
  contacts.forEach(c => {
    const cid = String(c.id ?? c.contact_id);
    const inGroupSelection = Object.entries(groupMembers).some(([gid, members]) =>
      selectedGroupIds.has(gid) && members.has(cid)
    );
    if ((inGroupSelection || manualContactIds.has(cid)) && !excludedContactIds.has(cid)) {
      allSelectedContactIds.add(cid);
    }
  });

  // Field form helpers
  function openAddField() {
    setEditingFieldIndex(null); setFName(""); setFLabel(""); setFDescription("");
    setFType("text"); setFRequired(false); setFError(null); setShowFieldForm(true);
    setFNameManuallyEdited(false);
  }

  function openEditField(index: number) {
    const f = localFields[index];
    setEditingFieldIndex(index); setFName(f.fieldName); setFLabel(f.fieldLabel);
    setFDescription(f.description); setFType(f.fieldType); setFRequired(f.isRequired);
    setFError(null); setShowFieldForm(true);
    setFNameManuallyEdited(false);
  }

  function handleSaveLocalField() {
    if (!fLabel.trim()) { setFError("Field label is required."); return; }
    const newField = {
      fieldName: fName.trim() || fLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      fieldLabel: fLabel.trim(),
      description: fDescription.trim(),
      fieldType: fType,
      isRequired: fRequired
    };
    if (editingFieldIndex !== null) {
      setLocalFields(prev => prev.map((f, i) => i === editingFieldIndex ? newField : f));
    } else {
      setLocalFields(prev => [...prev, newField]);
    }
    setShowFieldForm(false); setEditingFieldIndex(null);
  }

  function handleDeleteLocalField(index: number) {
    setLocalFields(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!user?.org_id || !user?.dbId || createRef.current) return;
    createRef.current = true; setCreateLoading(true);
    try {
      const { data: rawData, error } = await supabase.rpc("f_create_campaign", {
        p_org_id: user.org_id, p_created_by: user.dbId, p_name: name,
        p_description: "", p_campaign_type: "collect", p_greeting: greeting,
        p_instructions: instructions, p_timezone: "America/New_York", p_status: "DRAFT",
        p_schedule_type: scheduleType,
        p_scheduled_start_at: scheduleType === 'run_once' && scheduledStartAt
          ? new Date(scheduledStartAt).toISOString()
          : null,
        p_call_start_time: scheduleType === 'recurring' ? callStartTime : null,
        p_call_end_time: scheduleType === 'recurring' ? callEndTime : null,
        p_days_of_week: scheduleType === 'recurring' ? daysOfWeek : null,
      });
      if (error) throw error;
      const campaignId = Array.isArray(rawData) ? (rawData[0]?.id ?? rawData[0]) : (rawData?.id ?? rawData);
      if (!campaignId) throw new Error("Failed to get campaign ID");
      for (const gid of Array.from(selectedGroupIds)) {
        await supabase.rpc("f_add_contact_group_to_campaign", { p_campaign_id: String(campaignId), p_contact_group_id: String(gid) });
        await supabase.rpc("f_add_group_contacts_to_campaign", { p_campaign_id: String(campaignId), p_group_id: String(gid) });
      }
      if (allSelectedContactIds.size > 0) {
        await supabase.rpc("f_add_contacts_to_campaign", { p_campaign_id: String(campaignId), p_contact_ids: Array.from(allSelectedContactIds) });
      }
      // Create fields
      for (const f of localFields) {
        await supabase.rpc("f_create_campaign_field", {
          p_campaign_id: String(campaignId), p_field_name: f.fieldName, p_field_label: f.fieldLabel,
          p_description: f.description, p_field_type: f.fieldType, p_is_required: f.isRequired, p_created_by: user.dbId,
        });
      }
      onCreate(); onClose();
    } catch (err: any) { console.error("handleCreate:", err); createRef.current = false; }
    finally { setCreateLoading(false); }
  }

  const stepTitles = ["Campaign Setup", "Targeting", "Schedule", "Review"];
  const canNext1 = name.trim().length > 0 && greeting.trim().length > 0 && instructions.trim().length > 0;
  const canNext2 = allSelectedContactIds.size > 0;
  const canNext3 = scheduleType !== 'run_once' || !!scheduledStartAt;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>Set up your campaign in 4 steps.</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-2">
          {stepTitles.map((t, i) => (
            <div key={t} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step > i + 1 ? "bg-accent text-accent-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("text-xs mt-1 font-medium", step === i + 1 ? "text-foreground" : "text-muted-foreground")}>{t}</span>
              </div>
              {i < stepTitles.length - 1 && <div className={cn("h-px flex-1 -mt-4 transition-colors", step > i + 1 ? "bg-accent" : "bg-border")} />}
            </div>
          ))}
        </div>

        <Separator />

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="camp-name">Campaign Name <span className="text-destructive">*</span></Label>
              <Input id="camp-name" placeholder="e.g. Summer Outreach 2026" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-greeting">Greeting <span className="text-destructive">*</span></Label>
              <textarea id="camp-greeting" className={TEXTAREA_CLASS} placeholder="Hello, this is..." value={greeting} onChange={(e) => setGreeting(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-instructions">Instructions <span className="text-destructive">*</span></Label>
              <textarea id="camp-instructions" className={TEXTAREA_CLASS} placeholder="Please ask the contact about..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>

            <Separator className="my-2" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">What should the AI collect?</h4>
                  <p className="text-[11px] text-muted-foreground">Optional — you can also add fields later </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={openAddField}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              {localFields.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {localFields.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{f.fieldLabel}</p>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", FIELD_TYPE_COLORS[f.fieldType])}>{f.fieldType}</span>
                          {f.isRequired && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-semibold">required</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditField(i)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteLocalField(i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showFieldForm && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase text-primary tracking-wider">{editingFieldIndex !== null ? "Edit Field" : "New Field"}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => setShowFieldForm(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                  {fError && <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[10px]">{fError}</div>}

                  <div className="space-y-1.5">
                    <Label className="text-xs">What to collect <span className="text-destructive">*</span></Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Customer Name, Satisfaction Rating" value={fLabel} onChange={(e) => {
                      setFLabel(e.target.value);
                      if (!fNameManuallyEdited) {
                        setFName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
                      }
                    }} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">How should the AI ask for it?</Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Ask for their preferred name" value={fDescription} onChange={(e) => setFDescription(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <Select value={fType} onValueChange={(v: any) => setFType(v)}>
                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="boolean">Boolean</SelectItem><SelectItem value="choice">Choice</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <Checkbox id="f-req" checked={fRequired} onCheckedChange={(v) => setFRequired(!!v)} />
                      <Label htmlFor="f-req" className="text-xs cursor-pointer">Required</Label>
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" onClick={handleSaveLocalField}>{editingFieldIndex !== null ? "Save Changes" : "Add Field"}</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2 flex flex-col min-h-0">
            {loadingStep2 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Loading groups and contacts...</p>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col min-h-0">
                <TargetingPanel
                  groups={groups}
                  contacts={contacts}
                  selectedGroupIds={selectedGroupIds}
                  manualContactIds={manualContactIds}
                  excludedContactIds={excludedContactIds}
                  groupMembers={groupMembers}
                  onToggleGroup={handleToggleGroup}
                  onToggleContact={handleToggleContact}
                  loading={loadingStep2}
                />
                <TargetingSummary selectedCount={allSelectedContactIds.size} />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Schedule</Label>
              <div className="grid gap-2">
                {[
                  { id: 'immediate', label: 'Immediate', description: 'Campaign runs as soon as you launch it.' },
                  { id: 'run_once', label: 'Run Once', description: 'Schedule the campaign to start at a specific date and time.' },
                  { id: 'recurring', label: 'Recurring', description: 'Set a weekly window for automated calling.' },
                ].map((opt) => (
                  <label key={opt.id} className={cn(
                    "flex flex-col p-3 rounded-lg border cursor-pointer transition-colors",
                    scheduleType === opt.id ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", scheduleType === opt.id ? "border-primary" : "border-muted-foreground")}>
                        {scheduleType === opt.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <input type="radio" className="hidden" name="schedule" checked={scheduleType === opt.id} onChange={() => setScheduleType(opt.id as any)} />
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground ml-6">{opt.description}</p>
                  </label>
                ))}
              </div>
            </div>

            {scheduleType === 'run_once' && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Scheduled Start</Label>
                  <Input
                    type="datetime-local"
                    className="h-9 text-xs"
                    value={scheduledStartAt || ""}
                    onChange={(e) => setScheduledStartAt(e.target.value)}
                  />
                </div>
              </div>
            )}

            {scheduleType === 'recurring' && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs">Active Days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                        }}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold transition-colors border",
                          daysOfWeek.includes(day)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Time</Label>
                    <Input type="time" className="h-8 text-xs" value={callStartTime} onChange={(e) => setCallStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Time</Label>
                    <Input type="time" className="h-8 text-xs" value={callEndTime} onChange={(e) => setCallEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Name</span><span className="font-medium">{name}</span></div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium">
                  {scheduleType === 'immediate' && "Immediate"}
                  {scheduleType === 'run_once' && `Run Once — ${scheduledStartAt ? new Date(scheduledStartAt).toLocaleString() : "Not set"}`}
                  {scheduleType === 'recurring' && `Recurring — ${daysOfWeek.join(' ')}, ${callStartTime}–${callEndTime}`}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Status</span><StatusBadge variant="neutral">Draft</StatusBadge></div>
              <div className="flex justify-between px-4 py-2.5 text-primary font-bold"><span className="text-muted-foreground">Fields</span><span>{localFields.length}</span></div>
              <div className="flex justify-between px-4 py-2.5 bg-muted/30">
                <span className="font-semibold">Total targeted contacts</span>
                <span className="font-bold text-primary tabular-nums">{allSelectedContactIds.size}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => (step > 1 ? setStep(step - 1) : onClose())}>
            {step > 1 ? <><ChevronLeft className="h-4 w-4 mr-1" /> Back</> : "Cancel"}
          </Button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 1 ? !canNext1 :
                  step === 2 ? !canNext2 :
                    !canNext3
              }
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              )}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <Button onClick={handleCreate} disabled={createLoading}>
              <Megaphone className="h-4 w-4 mr-1" /> {createLoading ? "Creating..." : "Create Campaign"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Campaign Detail Drawer (tabbed) ───────────────────────────────────────────

function CampaignDetailDrawer({
  campaign: listCampaign, open, onClose, onRefresh,
}: {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Full campaign data
  const [fullCampaign, setFullCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Campaign fields state
  const [fields, setFields] = useState<CampaignField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Launch run state
  const [activeRun, setActiveRun] = useState<any>(null);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState<any>(null);

  // Pre-launch review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContacts, setReviewContacts] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── Reset on drawer close ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFullCampaign(null); setFields([]);
      setShowReviewModal(false); setReviewContacts([]); setReviewLoading(false);
      setActiveRun(null); setLaunchSuccess(null); setLaunchError(null);
    }
  }, [open]);

  async function fetchFullCampaign() {
    if (!listCampaign || !user?.org_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_campaign_by_id", { p_id: listCampaign.id });
      if (error) throw error;
      setFullCampaign(Array.isArray(data) ? data[0] : data);
    } catch (err: any) { console.error("fetchFullCampaign error:", err); }
    finally { setLoading(false); }
  }

  async function fetchFields() {
    if (!listCampaign) return;
    setFieldsLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_campaign_fields_by_campaign_id", { p_campaign_id: listCampaign.id });
      if (error) throw error;
      setFields((data || []).map((f: any) => ({
        id: f.id, campaignId: f.campaign_id,
        fieldName: f.field_name, fieldLabel: f.field_label,
        description: f.description ?? "", fieldType: f.field_type ?? "text",
        isRequired: f.is_required ?? false,
      })));
    } catch (err: any) { console.error("fetchFields error:", err); }
    finally { setFieldsLoading(false); }
  }

  async function fetchActiveRun() {
    if (!listCampaign) return;
    try {
      const { data, error } = await supabase.rpc("f_get_active_campaign_run", { p_camp_id: listCampaign.id });
      if (!error && data) setActiveRun(Array.isArray(data) ? data[0] : data);
      else setActiveRun(null);
    } catch (err) { console.error("fetchActiveRun error:", err); }
  }

  useEffect(() => {
    if (open && listCampaign) {
      fetchFullCampaign();
      fetchFields();
      fetchActiveRun();
    }
  }, [open, listCampaign]);


  // ── Launch campaign run ─────────────────────────────────────────────────────
  async function openReviewModal() {
    if (!listCampaign || !user?.org_id || !fullCampaign?.target_contact_ids) return;
    setShowReviewModal(true); setReviewLoading(true); setLaunchError(null);
    try {
      const { data, error } = await supabase.rpc("f_get_contacts", { p_org_id: user.org_id });
      if (error) throw error;
      const targetIds = new Set(fullCampaign.target_contact_ids.map(String));
      setReviewContacts((data || []).filter((c: any) => targetIds.has(String(c.id))));
    } catch (err: any) { setLaunchError(err.message || "Failed to load preview contacts."); }
    finally { setReviewLoading(false); }
  }

  async function handleConfirmLaunch() {
    if (!listCampaign || !fullCampaign) return;
    setLaunchLoading(true); setLaunchError(null);
    try {

      // 2. Create the run with scheduled time
      const isScheduled = fullCampaign.schedule_type === 'run_once' || fullCampaign.schedule_type === 'recurring';
      const scheduledAt = fullCampaign.schedule_type === 'run_once' ? fullCampaign.scheduled_start_at : null;

      const { data, error } = await supabase.rpc("f_create_campaign_run", {
        p_camp_id: listCampaign.id,
        p_initial_status: isScheduled ? "SCHEDULED" : "RUNNING",
        p_scheduled_at: scheduledAt,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setLaunchSuccess(result);
      setShowReviewModal(false);
      onRefresh();
      fetchActiveRun();
    } catch (err: any) { setLaunchError(err.message || "Failed to launch campaign run."); }
    finally { setLaunchLoading(false); }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  if (!listCampaign) return null;
  const status = listCampaign.status || "DRAFT";
  const meta = statusMeta[status] || statusMeta.DRAFT;
  const isDraft = status === "DRAFT";
  const hasContacts = listCampaign.totalRecipients > 0;
  const hasFields = fields.length > 0;
  const canLaunch = isDraft && hasContacts && hasFields && !activeRun && !launchSuccess;

  const groupsLinkedCount = loading ? "..." : (fullCampaign?.contact_group_ids?.length ?? 0);
  const directContactsCount = loading ? "..." : (fullCampaign?.target_contact_ids?.length ?? 0);
  const greetingText = loading ? "Loading..." : (fullCampaign?.greeting || "No greeting defined.");
  const instructionsText = loading ? "Loading..." : (fullCampaign?.instructions || "No instructions defined.");

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        {/* Wider than original md → lg to accommodate tabs */}
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">

          {/* ── Header ── */}
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle className="text-lg">{listCampaign.name}</SheetTitle>
                <SheetDescription className="mt-1">Created {listCampaign.createdAt}</SheetDescription>
              </div>
              <StatusBadge variant={meta.variant}>
                <meta.icon className="h-3 w-3 mr-1 inline" />{meta.label}
              </StatusBadge>
            </div>
          </SheetHeader>

          <Separator />

          <div className="pt-4 space-y-0">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 pb-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Total Recipients</p>
                <p className="text-2xl font-semibold tabular-nums text-primary">{listCampaign.totalRecipients}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm font-medium uppercase">{status}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Groups Linked</p>
                <p className="text-sm font-semibold tabular-nums">{groupsLinkedCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Direct Contacts</p>
                <p className="text-sm font-semibold tabular-nums">{directContactsCount}</p>
              </div>
            </div>

            <Separator />

            {/* Greeting + Instructions */}
            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Greeting</h4>
                <p className="text-sm whitespace-pre-wrap rounded-md bg-muted/30 p-2.5 border">{greetingText}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Instructions</h4>
                <p className="text-sm whitespace-pre-wrap rounded-md bg-muted/30 p-2.5 border">{instructionsText}</p>
              </div>
            </div>

            <Separator />
            <div className="py-4 space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> What the AI will collect
              </h4>
              {fieldsLoading ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading fields...</p>
              ) : fields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No fields defined. Use the Edit button to add fields.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {fields.map(f => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-muted/40 text-xs font-medium">
                      {f.fieldLabel}
                      <span className={cn("text-[10px] px-1 rounded-full font-semibold", FIELD_TYPE_COLORS[f.fieldType])}>
                        {f.fieldType}
                      </span>
                      {f.isRequired && <span className="text-[10px] text-destructive font-bold">*</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Launch Run section */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                Launch Campaign Run
              </h3>

              {/* Post-launch success */}
              {launchSuccess && (
                <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    <p className="text-sm font-semibold text-accent">Campaign run launched!</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">Run ID: {launchSuccess.new_run_id?.slice(0, 8)}...</p>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { onClose(); navigate("/campaign-runs"); }}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View in Campaign Runs
                  </Button>
                </div>
              )}

              {/* Active run already running */}
              {!launchSuccess && activeRun && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Campaign is currently running</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">Run ID: {activeRun.id?.slice(0, 8)}...</p>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { onClose(); navigate("/campaign-runs"); }}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Run Details
                  </Button>
                </div>
              )}


              {/* DRAFT: guards + launch button */}
              {!launchSuccess && !activeRun && isDraft && (
                <>
                  {/* Guard: no contacts */}
                  {!hasContacts && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        Add contacts or groups to this campaign before launching.
                      </p>
                    </div>
                  )}

                  {/* Guard: no fields */}
                  {hasContacts && !hasFields && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        Add at least one field via the Edit button before launching.
                      </p>
                    </div>
                  )}

                  {/* Launch error */}
                  {launchError && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {launchError}
                    </div>
                  )}

                  {/* Ready summary */}
                  {canLaunch && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-primary">Ready to launch</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {listCampaign.totalRecipients} contacts · {fields.length} field{fields.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}

                  <Button className="w-full" disabled={!canLaunch || launchLoading} onClick={openReviewModal}>
                    <Rocket className="h-4 w-4 mr-2" />
                    {launchLoading ? "Launching..." : "Launch Campaign Run"}
                  </Button>
                </>
              )}
            </div>

            <Separator />
            <div className="py-4 pb-0">
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>Review Before Launch</DialogTitle>
              <DialogDescription>Please verify all details before starting the campaign run.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-6">
            {/* Campaign Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Campaign Info</h4>
                <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4 text-sm">
                <div><Label className="text-xs text-muted-foreground">Name</Label><p className="font-medium">{listCampaign.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Greeting</Label><p className="whitespace-pre-wrap">{greetingText}</p></div>
                <div><Label className="text-xs text-muted-foreground">Instructions</Label><p className="whitespace-pre-wrap">{instructionsText}</p></div>
              </div>
            </div>

            {/* Fields Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Data Structure ({fields.length} fields)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fields.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-md border bg-background text-xs">
                    <span className="font-medium">{f.fieldLabel}</span>
                    <div className="flex gap-1">
                      <span className={cn("px-1.5 py-0.5 rounded-full font-semibold", FIELD_TYPE_COLORS[f.fieldType])}>{f.fieldType}</span>
                      {f.isRequired && <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-semibold">required</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacts Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Target Recipients</h4>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{fullCampaign?.target_contact_ids?.length || 0} total</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[250px] overflow-y-auto divide-y bg-background">
                  {reviewLoading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading contact preview...</div>
                  ) : reviewContacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">No contacts selected.</div>
                  ) : (
                    reviewContacts.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.phone_number || c.phone || "No phone number"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 border-t bg-muted/20">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={launchLoading}>Cancel</Button>
              <Button onClick={handleConfirmLaunch} disabled={launchLoading || reviewContacts.length === 0} className="gap-2">
                {launchLoading ? (
                  <><div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Launching...</>
                ) : (
                  <><Rocket className="h-4 w-4" /> Confirm & Launch Campaign</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Campaign Modal ───────────────────────────────────────────────────────

interface EditCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (updated: any, targetingChanged: boolean) => void;
  campaign: Campaign | null;
}

const EditCampaignModal = memo(({ open, onClose, onUpdate, campaign }: EditCampaignModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [greeting, setGreeting] = useState("");
  const [instructions, setInstructions] = useState("");

  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [manualContactIds, setManualContactIds] = useState<Set<string>>(new Set());
  const [excludedContactIds, setExcludedContactIds] = useState<Set<string>>(new Set());
  const [initialGroupIds, setInitialGroupIds] = useState<Set<string>>(new Set());
  const [initialContactIds, setInitialContactIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTargeting, setLoadingTargeting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schedule state
  const [scheduleType, setScheduleType] = useState<"immediate" | "run_once" | "recurring">("immediate");
  const [scheduledStartAt, setScheduledStartAt] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState("09:00");
  const [callEndTime, setCallEndTime] = useState("18:00");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  // Fields state
  const [fields, setFields] = useState<CampaignField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CampaignField | null>(null);
  const [fName, setFName] = useState("");
  const [fLabel, setFLabel] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fType, setFType] = useState<"text" | "number" | "boolean" | "choice">("text");
  const [fRequired, setFRequired] = useState(false);
  const [fSaving, setFSaving] = useState(false);
  const [fError, setFError] = useState<string | null>(null);

  const isDraft = campaign?.status === "DRAFT";
  const isLocked = campaign?.status === "LOCKED";

  useEffect(() => {
    if (campaign && open) {
      setName(campaign.name ?? ""); setDescription(campaign.description ?? "");
      setGreeting(campaign.greeting ?? ""); setInstructions(campaign.instructions ?? "");
      setError(null); setActiveTab("details");
      fetchInitialTargeting();
      fetchFields();
    }
  }, [campaign, open]);

  async function fetchInitialTargeting() {
    if (!campaign || !user?.org_id) return;
    setLoadingTargeting(true);
    try {
      const [full, gs, cs] = await Promise.all([
        supabase.rpc("f_get_campaign_by_id", { p_id: campaign.id }),
        supabase.rpc("f_get_contact_groups", { p_org_id: user.org_id }),
        supabase.rpc("f_get_contacts", { p_org_id: user.org_id }),
      ]);
      const r = (Array.isArray(full.data) ? full.data[0] : full.data) || {};
      const gids = (r.contact_group_ids || []).map(String);
      const cids = new Set<string>((r.target_contact_ids || []).map(String));

      const gMembers: Record<string, Set<string>> = {};
      const newManual = new Set<string>();
      const newExcluded = new Set<string>();

      // Fetch all selected group members first to categorize contacts
      await Promise.all(gids.map(async (gid: string) => {
        const { data } = await supabase.rpc("f_get_group_contacts", { p_group_id: gid });
        if (data) {
          const ids = new Set<string>(data.map((c: any) => String(c.id ?? c.contact_id)));
          gMembers[gid] = ids;
        }
      }));

      // Categorize contacts: 
      // Manual = in cids but not in any selected group's members
      // Excluded = in group members but not in cids
      const allGroupMembers = new Set<string>();
      Object.values(gMembers).forEach(members => members.forEach(id => allGroupMembers.add(id)));

      cids.forEach(id => {
        if (!allGroupMembers.has(id)) newManual.add(id);
      });

      allGroupMembers.forEach(id => {
        if (!cids.has(id)) newExcluded.add(id);
      });

      setName(r.name ?? campaign.name ?? "");
      setDescription(r.description ?? campaign.description ?? "");
      setGreeting(r.greeting ?? campaign.greeting ?? "");
      setInstructions(r.instructions ?? campaign.instructions ?? "");

      setScheduleType(r.schedule_type || "immediate");
      setScheduledStartAt(r.scheduled_start_at ? new Date(r.scheduled_start_at).toISOString().slice(0, 16) : null);
      setCallStartTime(r.call_start_time || "09:00");
      setCallEndTime(r.call_end_time || "18:00");
      setDaysOfWeek(r.days_of_week || ['MON', 'TUE', 'WED', 'THU', 'FRI']);

      setSelectedGroupIds(new Set(gids));
      setInitialGroupIds(new Set(gids));
      setManualContactIds(newManual);
      setInitialContactIds(new Set(cids)); // Keep the flattened original for diffing
      setExcludedContactIds(newExcluded);
      setGroupMembers(gMembers);

      setGroups(gs.data || []);
      setContacts(cs.data || []);
    } catch (err) { console.error("fetchInitialTargeting:", err); }
    finally { setLoadingTargeting(false); }
  }

  async function fetchGroupMembers(groupId: string) {
    if (groupMembers[groupId]) return;
    const { data, error } = await supabase.rpc("f_get_group_contacts", { p_group_id: groupId });
    if (!error && data) {
      const ids = new Set<string>(); data.forEach((c: any) => ids.add(String(c.id ?? c.contact_id)));
      setGroupMembers(prev => ({ ...prev, [groupId]: ids }));
    }
  }

  async function fetchFields() {
    if (!campaign) return;
    setFieldsLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_campaign_fields_by_campaign_id", { p_campaign_id: campaign.id });
      if (error) throw error;
      setFields((data || []).map((f: any) => ({
        id: f.id, campaignId: f.campaign_id,
        fieldName: f.field_name, fieldLabel: f.field_label,
        description: f.description ?? "", fieldType: f.field_type ?? "text",
        isRequired: f.is_required ?? false,
      })));
    } catch (err) { console.error("fetchFields:", err); }
    finally { setFieldsLoading(false); }
  }

  async function handleToggleGroup(groupId: string, checked: boolean) {
    setSelectedGroupIds(prev => { const n = new Set(prev); if (checked) n.add(String(groupId)); else n.delete(String(groupId)); return n; });
    if (checked) {
      if (groupMembers[groupId]) {
        setExcludedContactIds(prev => {
          const n = new Set(prev);
          groupMembers[groupId].forEach(id => n.delete(id));
          return n;
        });
      } else {
        const { data, error } = await supabase.rpc("f_get_group_contacts", { p_group_id: groupId });
        if (!error && data) {
          const ids = new Set<string>(); data.forEach((c: any) => ids.add(String(c.id ?? c.contact_id)));
          setGroupMembers(prev => ({ ...prev, [groupId]: ids }));
          setExcludedContactIds(prev => {
            const n = new Set(prev);
            ids.forEach(id => n.delete(id));
            return n;
          });
        }
      }
    }
  }

  function handleToggleContact(cid: string, checked: boolean) {
    const inGroupSelection = Object.entries(groupMembers).some(([gid, members]) =>
      selectedGroupIds.has(gid) && members.has(cid)
    );
    if (checked) {
      setManualContactIds(prev => { const n = new Set(prev); n.add(cid); return n; });
      setExcludedContactIds(prev => { const n = new Set(prev); n.delete(cid); return n; });
    } else {
      setManualContactIds(prev => { const n = new Set(prev); n.delete(cid); return n; });
      if (inGroupSelection) setExcludedContactIds(prev => { const n = new Set(prev); n.add(cid); return n; });
    }
  }

  const allSelectedContactIds = new Set<string>();
  contacts.forEach(c => {
    const cid = String(c.id ?? c.contact_id);
    const inGroupSelection = Object.entries(groupMembers).some(([gid, members]) =>
      selectedGroupIds.has(gid) && members.has(cid)
    );
    if ((inGroupSelection || manualContactIds.has(cid)) && !excludedContactIds.has(cid)) {
      allSelectedContactIds.add(cid);
    }
  });

  // Field form helpers
  function openAddField() {
    setEditingField(null); setFName(""); setFLabel(""); setFDescription("");
    setFType("text"); setFRequired(false); setFError(null); setShowFieldForm(true);
  }
  function openEditField(f: CampaignField) {
    setEditingField(f); setFName(f.fieldName); setFLabel(f.fieldLabel);
    setFDescription(f.description); setFType(f.fieldType);
    setFRequired(f.isRequired); setFError(null); setShowFieldForm(true);
  }
  async function handleSaveField() {
    if (!campaign || !user?.dbId) return;
    const finalName = fName.trim() || fLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!finalName || !fLabel.trim()) { setFError("What to collect is required."); return; }
    setFSaving(true); setFError(null);
    try {
      if (editingField) {
        const { error } = await supabase.rpc("f_update_campaign_field", {
          p_id: editingField.id, p_field_name: finalName, p_field_label: fLabel.trim(),
          p_description: fDescription.trim(), p_field_type: fType,
          p_is_required: fRequired, p_updated_by: user.dbId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("f_create_campaign_field", {
          p_campaign_id: campaign.id, p_field_name: finalName, p_field_label: fLabel.trim(),
          p_description: fDescription.trim(), p_field_type: fType,
          p_is_required: fRequired, p_created_by: user.dbId,
        });
        if (error) throw error;
      }
      await fetchFields(); setShowFieldForm(false); setEditingField(null);
    } catch (err: any) { setFError(err.message || "Failed to save field."); }
    finally { setFSaving(false); }
  }
  async function handleDeleteField(id: string) {
    try {
      const { error } = await supabase.rpc("f_delete_campaign_field", { p_id: id });
      if (error) throw error;
      await fetchFields();
    } catch (err) { console.error("handleDeleteField:", err); }
  }

  async function handleUpdate() {
    if (!campaign || !user?.dbId) return;
    setLoading(true); setError(null); let targetingChanged = false;
    try {
      const { error: updateError } = await supabase.rpc("f_update_campaign", {
        p_id: campaign.id, p_name: name.trim(), p_description: description.trim(),
        p_greeting: greeting.trim(), p_instructions: instructions.trim(),
        p_status: campaign.status, p_updated_by: user.dbId,
        p_schedule_type: scheduleType,
        p_scheduled_start_at: scheduleType === 'run_once' && scheduledStartAt
          ? new Date(scheduledStartAt).toISOString()
          : null,
        p_call_start_time: scheduleType === 'recurring' ? callStartTime : null,
        p_call_end_time: scheduleType === 'recurring' ? callEndTime : null,
        p_days_of_week: scheduleType === 'recurring' ? daysOfWeek : null,
      });
      if (updateError) throw updateError;

      if (isDraft) {
        const groupsToAdd = Array.from(selectedGroupIds).filter(id => !initialGroupIds.has(id));
        const groupsToRemove = Array.from(initialGroupIds).filter(id => !selectedGroupIds.has(id));
        const contactsToAdd = Array.from(allSelectedContactIds).filter(id => !initialContactIds.has(id));
        const contactsToRemove = Array.from(initialContactIds).filter(id => !allSelectedContactIds.has(id));

        if (groupsToAdd.length || groupsToRemove.length || contactsToAdd.length || contactsToRemove.length) targetingChanged = true;

        for (const gid of groupsToAdd) {
          await supabase.rpc("f_add_contact_group_to_campaign", { p_campaign_id: campaign.id, p_contact_group_id: gid });
          await supabase.rpc("f_add_group_contacts_to_campaign", { p_campaign_id: campaign.id, p_group_id: gid });
        }
        for (const gid of groupsToRemove) await supabase.rpc("f_remove_contact_group_from_campaign", { p_campaign_id: campaign.id, p_contact_group_id: gid });
        if (contactsToAdd.length > 0) await supabase.rpc("f_add_contacts_to_campaign", { p_campaign_id: campaign.id, p_contact_ids: contactsToAdd });
        for (const cid of contactsToRemove) await supabase.rpc("f_remove_contact_from_campaign", { p_campaign_id: campaign.id, p_contact_id: cid });
      }

      onUpdate({ ...campaign, name: name.trim(), description: description.trim(), greeting: greeting.trim(), instructions: instructions.trim() }, targetingChanged);
      onClose();
    } catch (err: any) {
      console.error("handleUpdate:", err);
      setError(err.message || "Failed to update campaign. Check if it has active runs.");
    } finally { setLoading(false); }
  }



  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>
            {isDraft ? "Modify campaign details and targeting." : "This campaign is locked and cannot be edited."}
          </DialogDescription>
        </DialogHeader>

        {isLocked && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm mb-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">This campaign is locked and cannot be edited.</p>
          </div>
        )}

        {error && <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="targeting" disabled={!isDraft}>Targeting</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <RenderField label="Campaign Name" value={name} id="edit-name" onChange={setName} isLocked={isLocked} />
            <RenderField label="Description" value={description} id="edit-desc" onChange={setDescription} isLocked={isLocked} />
            <RenderField label="Greeting" value={greeting} id="edit-greeting" onChange={setGreeting} isLocked={isLocked} />
            <RenderField label="Instructions" value={instructions} id="edit-instructions" onChange={setInstructions} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="targeting" className="py-4 space-y-4">
            {loadingTargeting ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading targeting data...</div>
            ) : (
              <TargetingPanel
                groups={groups}
                contacts={contacts}
                selectedGroupIds={selectedGroupIds}
                manualContactIds={manualContactIds}
                excludedContactIds={excludedContactIds}
                groupMembers={groupMembers}
                onToggleGroup={handleToggleGroup}
                onToggleContact={handleToggleContact}
              />
            )}
            <TargetingSummary selectedCount={allSelectedContactIds.size} />
          </TabsContent>

          <TabsContent value="fields" className="py-4 space-y-4">
            <div className="flex flex-col border rounded-lg bg-muted/30">
              <div className="p-2.5 border-b bg-muted/50 rounded-t-lg flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" /> Campaign Fields
                </Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={openAddField}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                </Button>
              </div>
              <div className="p-2 space-y-1 min-h-[120px] max-h-[300px] overflow-y-auto">
                {fieldsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading fields...</div>
                ) : fields.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground italic">No fields defined.</div>
                ) : (
                  fields.map((f) => (
                    <div key={f.id} className="flex items-start gap-2 p-2 rounded-md bg-background border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{f.fieldLabel}</p>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", FIELD_TYPE_COLORS[f.fieldType])}>{f.fieldType}</span>
                          {f.isRequired && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-semibold">required</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{f.fieldName}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditField(f)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteField(f.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {showFieldForm && (
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{editingField ? "Edit Field" : "New Field"}</h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFieldForm(false)}><X className="h-3.5 w-3.5" /></Button>
                </div>
                {fError && <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[10px]">{fError}</div>}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">What to collect <span className="text-destructive">*</span></Label>
                    <Input className="h-8 text-xs" placeholder="e.g. Customer Name, Satisfaction Rating" value={fLabel} onChange={(e) => {
                      setFLabel(e.target.value);
                      setFName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
                    }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">How should the AI ask for it?</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. Ask for their preferred name" value={fDescription} onChange={(e) => setFDescription(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={fType} onValueChange={(v: any) => setFType(v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="boolean">Boolean</SelectItem><SelectItem value="choice">Choice</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <Checkbox id="edit-f-req" checked={fRequired} onCheckedChange={(v) => setFRequired(!!v)} />
                    <Label htmlFor="edit-f-req" className="text-xs cursor-pointer">Required</Label>
                  </div>
                </div>
                <Button size="sm" className="w-full h-8 text-xs" onClick={handleSaveField} disabled={fSaving}>{fSaving ? "Saving..." : editingField ? "Save Changes" : "Add Field"}</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="py-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Schedule</Label>
                <div className="grid gap-2">
                  {[
                    { id: 'immediate', label: 'Immediate', description: 'Campaign runs as soon as you launch it.' },
                    { id: 'run_once', label: 'Run Once', description: 'Schedule the campaign to start at a specific date and time.' },
                    { id: 'recurring', label: 'Recurring', description: 'Set a weekly window for automated calling.' },
                  ].map((opt) => (
                    <label key={opt.id} className={cn(
                      "flex flex-col p-3 rounded-lg border cursor-pointer transition-colors",
                      scheduleType === opt.id ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50",
                      isLocked && "opacity-50 cursor-not-allowed"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", scheduleType === opt.id ? "border-primary" : "border-muted-foreground")}>
                          {scheduleType === opt.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <input type="radio" className="hidden" name="schedule-edit" checked={scheduleType === opt.id} onChange={() => !isLocked && setScheduleType(opt.id as any)} disabled={isLocked} />
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground ml-6">{opt.description}</p>
                    </label>
                  ))}
                </div>
              </div>

              {scheduleType === 'run_once' && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Scheduled Start</Label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-xs"
                      value={scheduledStartAt || ""}
                      onChange={(e) => setScheduledStartAt(e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              )}

              {scheduleType === 'recurring' && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Active Days</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                          }}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold transition-colors border",
                            daysOfWeek.includes(day)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-muted"
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Time</Label>
                      <Input type="time" className="h-8 text-xs" value={callStartTime} onChange={(e) => setCallStartTime(e.target.value)} disabled={isLocked} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Time</Label>
                      <Input type="time" className="h-8 text-xs" value={callEndTime} onChange={(e) => setCallEndTime(e.target.value)} disabled={isLocked} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          {!isLocked && <Button onClick={handleUpdate} disabled={loading || !name.trim()}>{loading ? "Saving..." : "Save Changes"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// ── Status Confirm Dialog ─────────────────────────────────────────────────────

function StatusConfirmDialog({ open, onClose, onConfirm, loading, details }: {
  open: boolean; onClose: () => void;
  onConfirm: (id: string, action: "deactivate" | "reactivate") => void;
  loading: boolean;
  details: { title: string; description: string; actionType: "deactivate" | "reactivate"; campaignId?: string } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{details?.title}</DialogTitle>
          <DialogDescription>{details?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={details?.actionType === "deactivate" ? "destructive" : "default"}
            onClick={() => details?.campaignId && onConfirm(details.campaignId, details.actionType)} disabled={loading}>
            {loading ? "Processing..." : details?.actionType === "deactivate" ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const preselectedGroup = searchParams.get("createFromGroup") ?? undefined;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(!!preselectedGroup);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<{
    title: string; description: string; actionType: "deactivate" | "reactivate"; campaignId?: string; campaignName?: string;
  } | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!user?.org_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_campaigns", { p_org_id: user.org_id });
      if (error) throw error;
      const mapped = (data || []).map((row: any) => ({
        id: String(row.id), name: row.name || "Unnamed", description: row.description || "",
        greeting: row.greeting || "", instructions: row.instructions || "",
        status: (row.status?.toUpperCase() || "DRAFT") as Campaign["status"],
        totalRecipients: row.total_recipients || 0, startDate: row.start_date || "—",
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "—",
        isActive: row.is_active !== false,
        schedule_type: row.schedule_type,
        scheduled_start_at: row.scheduled_start_at,
        call_start_time: row.call_start_time,
        call_end_time: row.call_end_time,
        days_of_week: row.days_of_week,
      }));
      setCampaigns(mapped);
    } catch (err) { console.error("fetchCampaigns:", err); }
    finally { setLoading(false); }
  }, [user?.org_id]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const filtered = campaigns.filter((c) => {
    return (c.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "all" || c.status === statusFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleToggleStatus(campaignId: string, action: "deactivate" | "reactivate") {
    setStatusActionLoading(true);
    try {
      const { error } = await supabase.rpc(
        action === "deactivate" ? "f_deactivate_campaign" : "f_reactivate_campaign",
        { p_id: campaignId }
      );
      if (error) throw error;
      await fetchCampaigns();
    } catch (err) { console.error("handleToggleStatus:", err); }
    finally { setStatusActionLoading(false); setConfirmDialogOpen(false); setConfirmDetails(null); }
  }

  function handleDuplicate(c: Campaign) {
    setCampaigns(prev => [{ ...c, id: String(Date.now()), name: `${c.name} (Copy)`, status: "DRAFT", createdAt: new Date().toISOString().slice(0, 10) }, ...prev]);
  }

  async function openEdit(c: Campaign) {
    try {
      const { data, error } = await supabase.rpc("f_get_campaign_by_id", { p_id: c.id });
      if (error) throw error;
      const r = (Array.isArray(data) ? data[0] : data) || {};
      setEditTarget({ ...c, name: r.name ?? c.name, description: r.description ?? c.description, greeting: r.greeting ?? c.greeting, instructions: r.instructions ?? c.instructions });
      setEditOpen(true);
    } catch (err) { console.error("openEdit:", err); setEditTarget(c); setEditOpen(true); }
  }

  function openDetail(c: Campaign) { setDetailCampaign(c); setDetailOpen(true); }

  const handleEditClose = useCallback(() => setEditOpen(false), []);
  const handleEditUpdate = useCallback((_updated: any, _targetingChanged: boolean) => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: Campaign) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name || "Unnamed"}</span>
          {item.schedule_type && item.schedule_type !== 'immediate' && (
            <Clock className="h-3 w-3 text-blue-500" />
          )}
        </div>
      )
    },
    {
      key: "totalRecipients", header: "Target",
      render: (item: Campaign) => (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {(item.totalRecipients ?? 0).toLocaleString()} contacts
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      render: (item: Campaign) => {
        const m = statusMeta[item.status || "DRAFT"];
        if (!m) return <StatusBadge variant="neutral"><FileEdit className="h-3 w-3 mr-1 inline" />Unknown</StatusBadge>;
        return <StatusBadge variant={m.variant}><m.icon className="h-3 w-3 mr-1 inline" />{m.label}</StatusBadge>;
      },
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (item: Campaign) => {
        if (!item.schedule_type || item.schedule_type === 'immediate') {
          return <span className="text-muted-foreground text-xs">Immediate</span>;
        }
        if (item.schedule_type === 'run_once') {
          return (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>Run Once — {item.scheduled_start_at ? new Date(item.scheduled_start_at).toLocaleDateString() : "—"}</span>
            </div>
          );
        }
        if (item.schedule_type === 'recurring') {
          return (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>Recurring — {item.days_of_week?.join(' ')}</span>
            </div>
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      }
    },
    {
      key: "startDate",
      header: "Start Date",
      render: (item: Campaign) => item.startDate && item.startDate !== "—"
        ? new Date(item.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : <span className="text-muted-foreground text-sm italic">Not set</span>
    },
    { key: "createdAt", header: "Created" },
    {
      key: "actions", header: "",
      render: (item: Campaign) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mr-2">
            <Switch className="data-[state=checked]:bg-green-600" checked={item.isActive}
              onCheckedChange={() => {
                setConfirmDetails(item.isActive
                  ? { title: "Deactivate Campaign", description: `Are you sure you want to deactivate "${item.name}"?`, actionType: "deactivate", campaignId: item.id }
                  : { title: "Reactivate Campaign", description: `Are you sure you want to reactivate "${item.name}"?`, actionType: "reactivate", campaignId: item.id }
                );
                setConfirmDialogOpen(true);
              }}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => openDetail(item)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate" onClick={() => handleDuplicate(item)}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Campaigns">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Create and manage outreach campaigns</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusMeta[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-6 w-6" />}
            title="No campaigns found"
            description={search || statusFilter !== "all" ? "Try adjusting your search or filter." : "Campaigns let you reach your contact groups at scale. Create your first campaign to get started."}
            action={!search && statusFilter === "all" ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button> : undefined}
          />
        ) : (
          <>
            <DataTable columns={columns} data={paginated} keyExtractor={(c) => c.id} onRowClick={openDetail} />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={fetchCampaigns} preselectedGroup={preselectedGroup} />

      <EditCampaignModal
        open={editOpen}
        onClose={handleEditClose}
        onUpdate={handleEditUpdate}
        campaign={editTarget}
      />

      <StatusConfirmDialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} onConfirm={handleToggleStatus} loading={statusActionLoading} details={confirmDetails} />

      <CampaignDetailDrawer
        campaign={detailCampaign}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRefresh={fetchCampaigns}
      />
    </DashboardLayout>
  );
}