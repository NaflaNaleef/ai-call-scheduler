import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Info, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface OrgRow {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  plan_id: string;
  subscription_status: string;
  current_period_end: string | null;
  calls_made: number;
  call_minutes_used: number;
  contacts_count: number;
  campaigns_count: number;
  user_count: number;
}

interface EditState {
  org: OrgRow;
  name: string;
  plan_id: string;
  is_active: boolean;
  reset_usage: boolean;
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [changelogEntries, setChangelogEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({
    title: '',
    description: '',
    release_date: new Date().toISOString().split('T')[0]
  });
  const [addingEntry, setAddingEntry] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  useEffect(() => {
    supabase
      .from('changelog')
      .select('*')
      .order('release_date', { ascending: false })
      .then(({ data }) => {
        setChangelogEntries(data || []);
      });
  }, []);

  const handleAddEntry = async () => {
    if (!newEntry.title.trim() || !newEntry.description.trim()) return;
    setAddingEntry(true);
    try {
      const { error } = await supabase
        .from('changelog')
        .insert({
          title: newEntry.title.trim(),
          description: newEntry.description.trim(),
          release_date: newEntry.release_date,
          is_published: true
        });
      if (error) throw error;
      toast({
        title: 'Entry published',
        description: 'Changelog updated successfully.'
      });
      setNewEntry({
        title: '',
        description: '',
        release_date: new Date().toISOString().split('T')[0]
      });
      setShowAddEntry(false);
      // Refresh list
      const { data } = await supabase
        .from('changelog')
        .select('*')
        .order('release_date', { ascending: false });
      setChangelogEntries(data || []);
    } catch (err: any) {
      toast({
        title: 'Failed to publish',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setAddingEntry(false);
    }
  };

  const handleToggleEntry = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('changelog')
        .update({ is_published: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      setChangelogEntries(prev =>
        prev.map(e => e.id === id
          ? { ...e, is_published: !currentStatus }
          : e
        )
      );
      toast({
        title: currentStatus ? 'Entry unpublished' : 'Entry published',
        description: currentStatus
          ? 'Entry hidden from users.'
          : 'Entry now visible to users.'
      });
    } catch (err: any) {
      toast({
        title: 'Failed to update',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    async function fetchOrgs() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .rpc('f_super_admin_get_all_orgs');

        if (fetchError) throw fetchError;
        setOrgs((data as OrgRow[]) || []);
      } catch (err: any) {
        console.error("Error fetching organizations:", err);
        setError(err.message || "Failed to load organizations.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, []);

  const handleSave = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc(
        'f_super_admin_update_org',
        {
          p_org_id: editState.org.id,
          p_name: editState.name,
          p_plan_id: editState.plan_id,
          p_is_active: editState.is_active,
          p_reset_usage: editState.reset_usage,
        }
      );
      if (error) throw error;

      toast({ title: "Organisation updated", description: `Changes saved for ${editState.name}.` });
      setEditState(null);

      const { data, error: fetchError } = await supabase.rpc('f_super_admin_get_all_orgs');
      if (!fetchError) setOrgs((data as OrgRow[]) || []);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message || "An error occurred.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout title="Super Admin">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Super Admin — Organization Overview
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform-level view (Beta)
          </p>
        </div>

        <Alert variant="default" className="bg-info/5 border-info/20 text-info">
          <Info className="h-4 w-4 text-info" />
          <AlertTitle className="text-info font-semibold">Notice</AlertTitle>
          <AlertDescription className="text-info opacity-90">
            Showing all organisations across the platform. Data is fetched via a secure backend function restricted to super admin only.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Calls Made</TableHead>
                  <TableHead className="text-right">Minutes Used</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Campaigns</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orgs.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name || "—"}</TableCell>
                      <TableCell>{row.email || "—"}</TableCell>
                      <TableCell className="capitalize">{row.plan_id || "—"}</TableCell>
                      <TableCell>
                        <span className="capitalize">{row.subscription_status || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right">{row.user_count?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.calls_made?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.call_minutes_used?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.contacts_count?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.campaigns_count?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell>{formatDate(row.current_period_end)}</TableCell>
                      <TableCell>
                        <StatusBadge variant={row.is_active ? "success" : "error"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setEditState({
                            org: row,
                            name: row.name || '',
                            plan_id: row.plan_id || 'free',
                            is_active: row.is_active,
                            reset_usage: false,
                          })}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!editState} onOpenChange={(o) => { if (!o) setEditState(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>
              Changes apply to the database only. Stripe billing is not affected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organisation Name</label>
              <Input
                value={editState?.name || ''}
                onChange={(e) => setEditState(prev =>
                  prev ? { ...prev, name: e.target.value } : null
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plan Override</label>
              <p className="text-xs text-muted-foreground">
                Database only — does not affect Stripe billing.
              </p>
              <Select
                value={editState?.plan_id || 'free'}
                onValueChange={(v) => setEditState(prev =>
                  prev ? { ...prev, plan_id: v } : null
                )}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Organisation Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive orgs cannot log in or use the platform.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editState?.is_active}
                onClick={() => setEditState(prev =>
                  prev ? { ...prev, is_active: !prev.is_active } : null
                )}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  editState?.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  editState?.is_active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <input
                type="checkbox"
                id="reset-usage"
                checked={editState?.reset_usage || false}
                onChange={(e) => setEditState(prev =>
                  prev ? { ...prev, reset_usage: e.target.checked } : null
                )}
                className="h-4 w-4 accent-destructive"
              />
              <div>
                <label htmlFor="reset-usage" className="text-sm font-medium text-destructive cursor-pointer">
                  Reset usage counters to zero
                </label>
                <p className="text-xs text-muted-foreground">
                  Resets calls made, minutes used, contacts and campaigns count. Use to fix billing errors only.
                </p>
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Saving…</>
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border border-border shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              What's New
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage changelog entries shown to users.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddEntry(!showAddEntry)}
          >
            + Add Entry
          </Button>
        </div>

        {showAddEntry && (
          <div className="px-6 py-4 border-b border-border space-y-3">
            <Input
              placeholder="Title e.g. API Gateway"
              value={newEntry.title}
              onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))}
            />
            <textarea
              placeholder="Description — what changed and how to use it"
              value={newEntry.description}
              onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2
                text-sm min-h-[80px] resize-none
                focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Input
              type="date"
              value={newEntry.release_date}
              onChange={e => setNewEntry(p => ({ ...p, release_date: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddEntry}
                disabled={addingEntry || !newEntry.title.trim()}
              >
                {addingEntry ? 'Publishing...' : 'Publish'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddEntry(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {changelogEntries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No entries yet.
            </p>
          ) : (
            changelogEntries.map(entry => (
              <div key={entry.id} className="px-6 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {entry.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.release_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={entry.is_published
                      ? "border-green-500/30 text-green-600"
                      : "border-border text-muted-foreground"
                    }
                  >
                    {entry.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 text-xs ${
                      entry.is_published
                        ? 'text-destructive border-destructive/30 hover:bg-destructive/5'
                        : 'text-green-600 border-green-500/30 hover:bg-green-500/5'
                    }`}
                    onClick={() => handleToggleEntry(entry.id, entry.is_published)}
                  >
                    {entry.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
