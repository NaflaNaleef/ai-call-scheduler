import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Copy, Eye, EyeOff, RefreshCw, Send, Loader2,
  Download, Trash2, AlertTriangle, Sun, Moon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIMEZONES = [
  "UTC-5 (Eastern)", "UTC-6 (Central)", "UTC-7 (Mountain)", "UTC-8 (Pacific)", "UTC+0 (GMT)", "UTC+1 (CET)",
];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Japanese"];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export default function SettingsPage() {
  const { toast } = useToast();

  // General
  const [general, setGeneral] = useState({ company: "Acme Corp", timezone: "UTC-5 (Eastern)", language: "English", dateFormat: "MM/DD/YYYY" });
  const [savedGeneral, setSavedGeneral] = useState({ ...general });
  const [generalSaving, setGeneralSaving] = useState(false);
  const generalChanged = JSON.stringify(general) !== JSON.stringify(savedGeneral);

  // Appearance
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [compactMode, setCompactMode] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    email: true, sms: false, campaignComplete: true, runFailed: true,
    weeklyReport: false, newContact: false,
  });
  const [savedNotifs, setSavedNotifs] = useState({ ...notifs });
  const [notifSaving, setNotifSaving] = useState(false);
  const notifChanged = JSON.stringify(notifs) !== JSON.stringify(savedNotifs);

  // API
  const [apiKey] = useState("sk-live-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [showKey, setShowKey] = useState(false);
  const [webhook, setWebhook] = useState("https://example.com/webhook");
  const [savedWebhook, setSavedWebhook] = useState(webhook);
  const [apiSaving, setApiSaving] = useState(false);
  const [regenModal, setRegenModal] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const webhookChanged = webhook !== savedWebhook;

  // Danger
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const maskedKey = `${"•".repeat(28)}${apiKey.slice(-8)}`;

  const save = async (section: string, fn: () => void) => {
    await new Promise((r) => setTimeout(r, 1000));
    fn();
    toast({ title: `${section} saved`, description: "Your changes have been applied." });
  };

  const notifItems = [
    { key: "email" as const, label: "Email Notifications", desc: "Receive updates about campaigns and calls." },
    { key: "sms" as const, label: "SMS Alerts", desc: "Receive SMS alerts for failed runs." },
    { key: "campaignComplete" as const, label: "Campaign Completed", desc: "Get notified when a campaign finishes." },
    { key: "runFailed" as const, label: "Run Failures", desc: "Immediate alerts when a campaign run fails." },
    { key: "weeklyReport" as const, label: "Weekly Reports", desc: "Receive a weekly performance summary." },
    { key: "newContact" as const, label: "New Contacts", desc: "Get notified when contacts are imported." },
  ];

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API & Integrations</TabsTrigger>
            <TabsTrigger value="data">Data & Privacy</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Organization</h3>
                <p className="text-sm text-muted-foreground">Manage your workspace details.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Company Name</Label>
                  <Input value={general.company} onChange={(e) => setGeneral({ ...general, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Timezone</Label>
                  <Select value={general.timezone} onValueChange={(v) => setGeneral({ ...general, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Language</Label>
                  <Select value={general.language} onValueChange={(v) => setGeneral({ ...general, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date Format</Label>
                  <Select value={general.dateFormat} onValueChange={(v) => setGeneral({ ...general, dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DATE_FORMATS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={!generalChanged || generalSaving || !general.company.trim()} onClick={async () => {
                  setGeneralSaving(true);
                  await save("General settings", () => setSavedGeneral({ ...general }));
                  setGeneralSaving(false);
                }}>
                  {generalSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
                </Button>
              </div>
            </section>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Theme</h3>
                <p className="text-sm text-muted-foreground">Customize the look and feel of your dashboard.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "light" as const, label: "Light", icon: Sun },
                  { value: "dark" as const, label: "Dark", icon: Moon },
                  { value: "system" as const, label: "System", icon: Moon },
                ]).map((t) => {
                  const Icon = t.icon;
                  const active = theme === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => {
                        setTheme(t.value);
                        toast({ title: `Theme: ${t.label}`, description: "Theme preference updated (mock)." });
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors duration-150 ${active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Compact Mode</p>
                  <p className="text-xs text-muted-foreground">Reduce spacing for denser information display.</p>
                </div>
                <Switch checked={compactMode} onCheckedChange={(v) => {
                  setCompactMode(v);
                  toast({ title: v ? "Compact mode on" : "Compact mode off", description: "Display preference updated (mock)." });
                }} />
              </div>
            </section>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Choose how and when you'd like to be notified.</p>
              </div>
              <div className="divide-y divide-border">
                {notifItems.map((n) => (
                  <div key={n.key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch checked={notifs[n.key]} onCheckedChange={(v) => setNotifs({ ...notifs, [n.key]: v })} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={!notifChanged || notifSaving} onClick={async () => {
                  setNotifSaving(true);
                  await save("Notification preferences", () => setSavedNotifs({ ...notifs }));
                  setNotifSaving(false);
                }}>
                  {notifSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Preferences"}
                </Button>
              </div>
            </section>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">API Key</h3>
                <p className="text-sm text-muted-foreground">Use this key to authenticate API requests.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Secret Key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={showKey ? apiKey : maskedKey} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} title={showKey ? "Hide" : "Show"}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(apiKey); toast({ title: "Copied", description: "API key copied to clipboard." }); }} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Keep your API key private. Do not share it publicly.</p>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium text-destructive">Regenerate API Key</p>
                  <p className="text-xs text-muted-foreground">This will invalidate the current key immediately.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setRegenModal(true)}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                </Button>
              </div>
            </section>

            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Webhooks</h3>
                <p className="text-sm text-muted-foreground">Receive real-time event notifications.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endpoint URL</Label>
                <div className="flex gap-2">
                  <Input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://..." />
                  <Button variant="outline" size="sm" disabled={testingWebhook} onClick={async () => {
                    setTestingWebhook(true);
                    await new Promise((r) => setTimeout(r, 1200));
                    setTestingWebhook(false);
                    toast({ title: "Webhook tested", description: "Test payload sent successfully." });
                  }}>
                    {testingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Test
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={!webhookChanged || apiSaving} onClick={async () => {
                  setApiSaving(true);
                  await save("Webhook URL", () => setSavedWebhook(webhook));
                  setApiSaving(false);
                }}>
                  {apiSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Webhook"}
                </Button>
              </div>
            </section>
          </TabsContent>

          {/* Data & Privacy Tab */}
          <TabsContent value="data" className="space-y-6">
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Export Data</h3>
                <p className="text-sm text-muted-foreground">Download a copy of all your data.</p>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium">Full Data Export</p>
                  <p className="text-xs text-muted-foreground">Includes contacts, campaigns, runs, and call logs.</p>
                </div>
                <Button variant="outline" size="sm" disabled={exporting} onClick={async () => {
                  setExporting(true);
                  await new Promise((r) => setTimeout(r, 1500));
                  setExporting(false);
                  toast({ title: "Export ready", description: "Your data export has been prepared (mock)." });
                }}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  {exporting ? "Preparing…" : "Export"}
                </Button>
              </div>
            </section>

            <section className="bg-card rounded-lg border border-destructive/30 p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">Irreversible and destructive actions.</p>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteModal(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Account
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* Regenerate API Key Modal */}
      <Dialog open={regenModal} onOpenChange={setRegenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>This will permanently invalidate your current API key. Any services using it will stop working immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenModal(false)} disabled={regenLoading}>Cancel</Button>
            <Button variant="destructive" disabled={regenLoading} onClick={async () => {
              setRegenLoading(true);
              await new Promise((r) => setTimeout(r, 1200));
              setRegenLoading(false);
              setRegenModal(false);
              toast({ title: "API key regenerated", description: "Your new key is now active." });
            }}>
              {regenLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Regenerating…</> : "Regenerate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={deleteModal} onOpenChange={(v) => { setDeleteModal(v); setDeleteConfirm(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>This action cannot be undone. Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteModal(false); setDeleteConfirm(""); }} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" disabled={deleteConfirm !== "DELETE" || deleteLoading} onClick={async () => {
              setDeleteLoading(true);
              await new Promise((r) => setTimeout(r, 1500));
              setDeleteLoading(false);
              setDeleteModal(false);
              setDeleteConfirm("");
              toast({ title: "Account deleted", description: "Your account has been removed (mock)." });
            }}>
              {deleteLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
