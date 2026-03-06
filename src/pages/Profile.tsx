import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  User, Mail, Phone, Shield, Eye, EyeOff, Loader2,
  Monitor, Smartphone, Globe, Clock, CheckCircle,
  AlertTriangle, LogOut, Link2, Unlink,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const INITIAL_PROFILE = {
  name: "Jane Doe",
  email: "jane.doe@company.com",
  phone: "+1 555-0100",
  role: "Admin",
  initials: "JD",
  department: "Engineering",
  location: "New York, US",
  joinedAt: "Jan 15, 2024",
};

const MOCK_SESSIONS = [
  { id: "1", device: "Chrome on macOS", ip: "192.168.1.42", lastActive: "Just now", current: true, icon: Monitor },
  { id: "2", device: "Safari on iPhone", ip: "10.0.0.12", lastActive: "2 hours ago", current: false, icon: Smartphone },
  { id: "3", device: "Firefox on Windows", ip: "172.16.0.5", lastActive: "3 days ago", current: false, icon: Monitor },
];

const MOCK_ACTIVITY = [
  { id: "1", action: "Signed in", detail: "Chrome on macOS", time: "2 min ago", icon: CheckCircle, color: "text-accent" },
  { id: "2", action: "Updated profile", detail: "Changed phone number", time: "1 hour ago", icon: User, color: "text-primary" },
  { id: "3", action: "Password changed", detail: "Via settings", time: "2 days ago", icon: Shield, color: "text-warning" },
  { id: "4", action: "API key regenerated", detail: "Previous key invalidated", time: "5 days ago", icon: AlertTriangle, color: "text-destructive" },
  { id: "5", action: "Connected Google", detail: "OAuth integration", time: "1 week ago", icon: Link2, color: "text-info" },
];

const MOCK_CONNECTIONS = [
  { id: "1", name: "Google", email: "jane.doe@gmail.com", connected: true, icon: "G" },
  { id: "2", name: "GitHub", email: "janedoe", connected: true, icon: "GH" },
  { id: "3", name: "Slack", email: "", connected: false, icon: "S" },
];

function getPasswordStrength(pw: string): { label: string; value: number; color: string } {
  if (pw.length < 8) return { label: "Too short", value: 15, color: "bg-destructive" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Weak", value: 33, color: "bg-destructive" };
  if (score <= 3) return { label: "Medium", value: 60, color: "bg-warning" };
  return { label: "Strong", value: 100, color: "bg-accent" };
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [connections, setConnections] = useState(MOCK_CONNECTIONS);
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [revokeModal, setRevokeModal] = useState<string | null>(null);

  const hasChanges =
    draft.name !== profile.name ||
    draft.email !== profile.email ||
    draft.phone !== profile.phone ||
    draft.department !== profile.department ||
    draft.location !== profile.location;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);

  const handleSave = async () => {
    if (!draft.name.trim() || !emailValid) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    const updated = {
      ...draft,
      initials: draft.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
    };
    setProfile(updated);
    setDraft(updated);
    setEditing(false);
    setSaving(false);
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };

  const handleCancel = () => { setDraft(profile); setEditing(false); };

  const handleChangePw = async () => {
    setPwSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPwSaving(false);
    setPwModal(false);
    setPwForm({ current: "", next: "", confirm: "" });
    toast({ title: "Password changed", description: "Your password has been updated." });
  };

  const pwValid = pwForm.current.length >= 1 && pwForm.next.length >= 8 && pwForm.next === pwForm.confirm;
  const pwStrength = getPasswordStrength(pwForm.next);

  const profileFields = [
    { label: "Full Name", value: profile.name, key: "name" as const, icon: User },
    { label: "Email", value: profile.email, key: "email" as const, icon: Mail },
    { label: "Phone", value: profile.phone, key: "phone" as const, icon: Phone },
    { label: "Department", value: profile.department, key: "department" as const, icon: Globe },
    { label: "Location", value: profile.location, key: "location" as const, icon: Globe },
    { label: "Role", value: profile.role, key: "role" as const, icon: Shield },
  ];

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-5xl space-y-6">
        {/* Top row: Summary + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — User Summary */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold">
              {profile.initials}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{profile.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">{profile.role}</Badge>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Joined {profile.joinedAt}
            </div>
            <div className="w-full space-y-2 mt-2">
              <Button className="w-full" onClick={() => { setDraft(profile); setEditing(true); }} disabled={editing}>
                Edit Profile
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setPwModal(true)}>Change Password</Button>
            </div>
          </div>

          {/* Right — Account Details */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Account Details</h3>
                <p className="text-sm text-muted-foreground">
                  {editing ? "Update your personal information below." : "Your account information at a glance."}
                </p>
              </div>
              {editing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving || !draft.name.trim() || !emailValid}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {profileFields.map((f) => {
                const Icon = f.icon;
                const isRole = f.key === "role";
                const editable = !isRole && editing;
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />{f.label}
                    </Label>
                    {editable ? (
                      <Input
                        value={(draft as any)[f.key]}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className={f.key === "email" && draft.email && !emailValid ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                    ) : (
                      <p className="text-sm font-medium py-2">
                        {isRole ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">{f.value}</Badge>
                        ) : f.value}
                      </p>
                    )}
                    {editing && f.key === "email" && draft.email && !emailValid && (
                      <p className="text-xs text-destructive">Please enter a valid email address.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabbed sections */}
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1">
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="connections">Connected Accounts</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-4 space-y-6">
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFA ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Authenticator App</p>
                    <p className="text-xs text-muted-foreground">
                      {twoFA ? "Two-factor authentication is enabled." : "Protect your account with TOTP."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFA}
                  onCheckedChange={(v) => {
                    setTwoFA(v);
                    toast({
                      title: v ? "2FA enabled" : "2FA disabled",
                      description: v ? "Your account is now more secure." : "Two-factor authentication has been turned off.",
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recovery Email</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Verified</Badge>
              </div>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-4">
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Active Sessions</h3>
                  <p className="text-sm text-muted-foreground">Manage devices signed into your account.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSessions((prev) => prev.filter((s) => s.current));
                    toast({ title: "Sessions revoked", description: "All other sessions have been signed out." });
                  }}
                  disabled={sessions.filter((s) => !s.current).length === 0}
                >
                  <LogOut className="h-4 w-4 mr-1" /> Revoke All Others
                </Button>
              </div>
              <div className="divide-y divide-border">
                {sessions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${s.current ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            {s.device}
                            {s.current && <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10 text-[10px] px-1.5 py-0">Current</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.ip} · {s.lastActive}</p>
                        </div>
                      </div>
                      {!s.current && (
                        <Button variant="ghost" size="sm" onClick={() => setRevokeModal(s.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Connected Accounts Tab */}
          <TabsContent value="connections" className="mt-4">
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Connected Accounts</h3>
                <p className="text-sm text-muted-foreground">Link third-party services to your account.</p>
              </div>
              <div className="divide-y divide-border">
                {connections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {c.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.connected ? c.email : "Not connected"}</p>
                      </div>
                    </div>
                    <Button
                      variant={c.connected ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        setConnections((prev) =>
                          prev.map((x) =>
                            x.id === c.id
                              ? { ...x, connected: !x.connected, email: x.connected ? "" : `${profile.name.toLowerCase().replace(" ", ".")}@${x.name.toLowerCase()}.com` }
                              : x
                          )
                        );
                        toast({
                          title: c.connected ? `${c.name} disconnected` : `${c.name} connected`,
                          description: c.connected ? "The integration has been removed." : "Account linked successfully.",
                        });
                      }}
                    >
                      {c.connected ? <><Unlink className="h-3.5 w-3.5 mr-1" /> Disconnect</> : <><Link2 className="h-3.5 w-3.5 mr-1" /> Connect</>}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="mt-4">
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">A log of security and account events.</p>
              </div>
              <div className="divide-y divide-border">
                {MOCK_ACTIVITY.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-3">
                      <div className={`w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center ${a.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Password Modal */}
      <Dialog open={pwModal} onOpenChange={setPwModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <div className="relative">
                <Input type={showCurrent ? "text" : "password"} value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNew ? "text" : "password"} value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwForm.next && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Strength:</span>
                    <span className={`text-xs font-medium ${pwStrength.value === 100 ? "text-accent" : pwStrength.value >= 60 ? "text-warning" : "text-destructive"}`}>
                      {pwStrength.label}
                    </span>
                  </div>
                  <Progress value={pwStrength.value} className="h-1.5" indicatorClassName={pwStrength.color} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwModal(false)} disabled={pwSaving}>Cancel</Button>
            <Button onClick={handleChangePw} disabled={!pwValid || pwSaving}>
              {pwSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Session Modal */}
      <Dialog open={!!revokeModal} onOpenChange={() => setRevokeModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Session</DialogTitle>
            <DialogDescription>This device will be signed out immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              setSessions((prev) => prev.filter((s) => s.id !== revokeModal));
              setRevokeModal(null);
              toast({ title: "Session revoked", description: "The device has been signed out." });
            }}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
