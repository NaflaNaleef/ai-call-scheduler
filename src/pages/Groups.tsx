import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, FolderOpen, Eye, Pencil, Trash2, X, Users, Megaphone, ExternalLink, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  status: string;
  type: string;
  createdAt: string;
}


const PAGE_SIZE = 4;

type ModalMode = "create" | "rename" | "delete" | null;

const statusVariant: Record<string, "success" | "neutral"> = {
  active: "success",
  inactive: "neutral",
};

const typeVariant: Record<string, "info" | "warning"> = {
  Static: "info",
  Dynamic: "warning",
};

export default function GroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<Group | null>(null);
  const [drawerContacts, setDrawerContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<{
    title: string;
    description: string;
    actionType: "deactivate" | "reactivate";
    groupId?: string;
  } | null>(null);

  // Add Contacts to Group state
  const [addContactsOpen, setAddContactsOpen] = useState(false);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [allContactsLoading, setAllContactsLoading] = useState(false);
  const [selectedNewContactIds, setSelectedNewContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const [selectedDrawerContactIds, setSelectedDrawerContactIds] = useState<Set<string>>(new Set());
  const [bulkRemoveConfirmOpen, setBulkRemoveConfirmOpen] = useState(false);
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);

  const fetchGroups = async () => {
    if (!user?.org_id) {
      setGroupsLoading(false);
      return;
    }
    setGroupsLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_contact_groups", { p_org_id: user.org_id });
      if (error) throw error;
      const mapped: Group[] = (data || []).map((row: any) => ({
        id: String(row.id ?? row.group_id ?? row.contact_group_id),
        name: row.name,
        description: row.description || "",
        contactCount: row.contact_count || 0,
        status: row.is_active === false ? "inactive" : "active",
        type: row.type || "Static",
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "",
      }));
      setGroups(mapped);
    } catch (err) {
      console.error("fetchGroups error:", err);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchGroupContacts = async (groupId: string) => {
    setContactsLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_group_contacts", { p_group_id: groupId });
      if (error) throw error;
      const mapped = (data || []).map((row: any) => ({
        id: String(row.id ?? row.contact_id),
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "Unknown",
        email: row.email || "",
        status: row.is_active === false ? "inactive" : "active",
      }));
      setDrawerContacts(mapped);
    } catch (err) {
      console.error("fetchGroupContacts error:", err);
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchAllContacts = async () => {
    if (!user?.org_id) return;
    setAllContactsLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_contacts", { p_org_id: user.org_id });
      if (error) throw error;
      const mapped = (data || []).map((row: any) => ({
        id: String(row.id ?? row.contact_id),
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "Unknown",
        email: row.email || "",
      }));
      setAllContacts(mapped);
    } catch (err) {
      console.error("fetchAllContacts error:", err);
    } finally {
      setAllContactsLoading(false);
    }
  };

  const handleBulkAddContacts = async () => {
    if (selectedNewContactIds.size === 0 || !drawerGroup) return;
    setIsBulkAdding(true);
    try {
      const promises = Array.from(selectedNewContactIds).map(contactId =>
        supabase.rpc("f_add_contact_to_group", {
          p_group_id: drawerGroup.id,
          p_contact_id: contactId
        })
      );
      await Promise.all(promises);

      // Refresh drawer state
      await fetchGroupContacts(drawerGroup.id);

      // Update local groups count to match reality
      setGroups(prev => prev.map(g =>
        g.id === drawerGroup.id
          ? { ...g, contactCount: g.contactCount + selectedNewContactIds.size }
          : g
      ));
      setDrawerGroup(d => d ? { ...d, contactCount: d.contactCount + selectedNewContactIds.size } : d);

      setAddContactsOpen(false);
      setSelectedNewContactIds(new Set());
    } catch (err) {
      console.error("handleBulkAddContacts error:", err);
    } finally {
      setIsBulkAdding(false);
    }
  };

  useEffect(() => {
    fetchGroups();

    // Listen for refresh signals from other parts of the app (e.g. Contacts.tsx)
    const handleRefresh = () => {
      console.log("GroupsPage: Refreshing data...");
      fetchGroups();
      if (drawerOpen && drawerGroup) {
        fetchGroupContacts(drawerGroup.id);
      }
    };

    window.addEventListener('refresh-group-drawer', handleRefresh);
    return () => window.removeEventListener('refresh-group-drawer', handleRefresh);
  }, [user?.org_id, drawerOpen, drawerGroup?.id]);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showEmpty = filtered.length === 0;

  function openCreate() {
    setFormName("");
    setFormDesc("");
    setModalMode("create");
  }

  function openRename(g: Group) {
    setSelectedGroup(g);
    setFormName(g.name);
    setFormDesc(g.description);
    setModalMode("rename");
  }


  function openDrawer(g: Group) {
    setDrawerGroup(g);
    fetchGroupContacts(g.id);
    setSelectedDrawerContactIds(new Set());
    setDrawerOpen(true);
  }

  async function handleCreate() {
    if (!formName.trim() || !user?.org_id || !user?.dbId) return;
    try {
      const { error } = await supabase.rpc("f_create_contact_group", {
        p_org_id: user.org_id,
        p_name: formName.trim(),
        p_description: formDesc.trim(),
        p_created_by: user.dbId,
      });
      if (error) throw error;
      await fetchGroups();
      setModalMode(null);
    } catch (err) {
      console.error("handleCreate error:", err);
    }
  }

  async function handleRename() {
    if (!formName.trim() || !selectedGroup || !user?.dbId) return;
    try {
      const { error } = await supabase.rpc("f_update_contact_group", {
        p_id: selectedGroup.id,
        p_name: formName.trim(),
        p_description: formDesc.trim(),
        p_updated_by: user.dbId,
      });
      if (error) throw error;
      await fetchGroups();
      if (drawerGroup?.id === selectedGroup.id) {
        setDrawerGroup((d) => (d ? { ...d, name: formName.trim(), description: formDesc.trim() } : d));
      }
      setModalMode(null);
    } catch (err) {
      console.error("handleRename error:", err);
    }
  }

  async function handleToggleStatus(groupId: string, action: "deactivate" | "reactivate") {
    setStatusActionLoading(true);
    try {
      const { error } = await supabase.rpc(
        action === "deactivate" ? "f_deactivate_contact_group" : "f_reactivate_contact_group",
        { p_id: groupId }
      );
      if (error) throw error;
      await fetchGroups();
      if (drawerGroup?.id === groupId) {
        setDrawerGroup((d) => (d ? { ...d, status: action === "deactivate" ? "inactive" : "active" } : d));
      }
    } catch (err) {
      console.error("handleToggleStatus error:", err);
    } finally {
      setStatusActionLoading(false);
      setConfirmDialogOpen(false);
      setConfirmDetails(null);
    }
  }

  async function handleRemoveContactFromGroup(contactId: string) {
    if (!drawerGroup) return;
    try {
      const { data, error } = await supabase.rpc("f_remove_contact_from_group", {
        p_group_id: drawerGroup.id,
        p_contact_id: contactId
      });

      if (error) throw error;

      // Update local state
      setDrawerContacts((prev) => prev.filter((c) => c.id !== contactId));
      setSelectedDrawerContactIds((prev) => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });

      // Update the contact count in the drawer and the main groups list
      setDrawerGroup((d) => d ? { ...d, contactCount: Math.max(0, d.contactCount - 1) } : d);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === drawerGroup.id ? { ...g, contactCount: Math.max(0, g.contactCount - 1) } : g
        )
      );
    } catch (err) {
      console.error("handleRemoveContactFromGroup error:", err);
    }
  }

  async function handleBulkRemove() {
    if (selectedDrawerContactIds.size === 0 || !drawerGroup) return;
    setIsBulkRemoving(true);
    try {
      const contactIds = Array.from(selectedDrawerContactIds);
      const promises = contactIds.map(id =>
        supabase.rpc("f_remove_contact_from_group", {
          p_group_id: drawerGroup.id,
          p_contact_id: id
        })
      );
      await Promise.all(promises);

      // Update local state
      setDrawerContacts((prev) => prev.filter((c) => !selectedDrawerContactIds.has(c.id)));

      const removedCount = selectedDrawerContactIds.size;
      setDrawerGroup((d) => d ? { ...d, contactCount: Math.max(0, d.contactCount - removedCount) } : d);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === drawerGroup.id ? { ...g, contactCount: Math.max(0, g.contactCount - removedCount) } : g
        )
      );

      setSelectedDrawerContactIds(new Set());
      setBulkRemoveConfirmOpen(false);
      // Extra safety: full refresh of the contacts list for this group
      await fetchGroupContacts(drawerGroup.id);
    } catch (err) {
      console.error("handleBulkRemove error:", err);
    } finally {
      setIsBulkRemoving(false);
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    {
      key: "contactCount",
      header: "Contacts",
      render: (item: Group) => <span className="font-medium tabular-nums">{item.contactCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (item: Group) => (
        <div onClick={(e) => e.stopPropagation()} className="inline-block align-middle">
          <Switch
            className="data-[state=checked]:bg-green-600"
            checked={item.status === "active"}
            onCheckedChange={() => {
              if (item.status === "active") {
                setConfirmDetails({
                  title: "Deactivate Group",
                  description: `Are you sure you want to deactivate "${item.name}"?`,
                  actionType: "deactivate",
                  groupId: item.id
                });
              } else {
                setConfirmDetails({
                  title: "Reactivate Group",
                  description: `Are you sure you want to reactivate "${item.name}"?`,
                  actionType: "reactivate",
                  groupId: item.id
                });
              }
              setConfirmDialogOpen(true);
            }}
          />
        </div>
      ),
    },
    { key: "createdAt", header: "Created" },
    {
      key: "actions",
      header: "",
      render: (item: Group) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="View group"
            onClick={() => openDrawer(item)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Rename"
            onClick={() => openRename(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Groups">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Organize contacts into targeted groups for precise campaign delivery
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Create Group
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Table or Empty */}
        {groupsLoading ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="h-10 bg-muted/50 border-b border-border" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 border-b border-border last:border-0 p-4 animate-pulse flex items-center justify-between">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No groups found"
            description={
              search
                ? "Try a different search term."
                : "Groups let you segment contacts for targeted campaigns. Create your first group to unlock precise audience targeting."
            }
            action={
              !search ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Create Group
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(g) => g.id}
              onRowClick={openDrawer}
            />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      <Dialog open={modalMode === "create"} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Add a new contact group to organize your audience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. VIP Clients"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                placeholder="Describe the targeting purpose of this group..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RENAME MODAL ── */}
      <Dialog open={modalMode === "rename"} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>Update the name and description for this group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-desc">Description</Label>
              <Textarea
                id="rename-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!formName.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── GROUP DETAIL DRAWER ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawerGroup && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle className="text-lg">{drawerGroup.name}</SheetTitle>
                    <SheetDescription className="mt-1">{drawerGroup.description}</SheetDescription>
                  </div>
                  <StatusBadge variant={statusVariant[drawerGroup.status] ?? "neutral"}>
                    {drawerGroup.status}
                  </StatusBadge>
                </div>
              </SheetHeader>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 py-4">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Contacts</p>
                  <p className="text-2xl font-semibold tabular-nums">{drawerGroup.contactCount}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-medium">{drawerGroup.createdAt}</p>
                </div>
              </div>

              <Separator />

              {/* Contacts in group */}
              <div className="py-4 space-y-3">
                {selectedDrawerContactIds.size > 0 ? (
                  <div className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-md px-3 py-1.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedDrawerContactIds.size === drawerContacts.length && drawerContacts.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDrawerContactIds(new Set(drawerContacts.map(c => c.id)));
                          } else {
                            setSelectedDrawerContactIds(new Set());
                          }
                        }}
                      />
                      <span className="text-xs font-medium text-destructive">{selectedDrawerContactIds.size} selected</span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setBulkRemoveConfirmOpen(true)}
                    >
                      Remove Selected
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Contacts in Group
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        title="Add contacts to group"
                        onClick={() => {
                          setAddContactsOpen(true);
                          fetchAllContacts();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary"
                        onClick={() => navigate("/contacts?group=" + drawerGroup.id)}
                      >
                        View All <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {contactsLoading ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
                    ))}
                  </div>
                ) : drawerContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No contacts in this group.</p>
                ) : (
                  <div className="space-y-1">
                    {drawerContacts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Checkbox
                            className={cn(
                              "transition-opacity h-4 w-4",
                              selectedDrawerContactIds.has(c.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                            checked={selectedDrawerContactIds.has(c.id)}
                            onCheckedChange={(checked) => {
                              setSelectedDrawerContactIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge
                            variant={
                              c.status === "active"
                                ? "success"
                                : c.status === "unsubscribed"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {c.status}
                          </StatusBadge>
                          <button
                            title="Remove from group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveContactFromGroup(c.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="py-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setDrawerOpen(false);
                    openRename(drawerGroup);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Rename Group
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-primary border-primary/30 hover:bg-primary/5"
                  onClick={() => {
                    // UI-only: would navigate to campaign creation with this group pre-selected
                    navigate("/campaigns?createFromGroup=" + drawerGroup.id);
                    setDrawerOpen(false);
                  }}
                >
                  <Megaphone className="h-4 w-4 mr-2" /> Create Campaign from Group
                </Button>
                {drawerGroup.status === "active" ? (
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setConfirmDetails({
                        title: "Deactivate Group",
                        description: `Are you sure you want to deactivate "${drawerGroup.name}"?`,
                        actionType: "deactivate",
                        groupId: drawerGroup.id
                      });
                      setConfirmDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full text-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={() => {
                      setConfirmDetails({
                        title: "Reactivate Group",
                        description: `Are you sure you want to reactivate "${drawerGroup.name}"?`,
                        actionType: "reactivate",
                        groupId: drawerGroup.id
                      });
                      setConfirmDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Reactivate Group
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── BULK REMOVE CONFIRMATION DIALOG ── */}
      <Dialog open={bulkRemoveConfirmOpen} onOpenChange={setBulkRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedDrawerContactIds.size} contact{selectedDrawerContactIds.size !== 1 && "s"} from this group?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRemoveConfirmOpen(false)} disabled={isBulkRemoving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkRemove} disabled={isBulkRemoving}>
              {isBulkRemoving ? "Removing..." : "Remove Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── STATUS CONFIRMATION DIALOG ── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDetails?.title}</DialogTitle>
            <DialogDescription>{confirmDetails?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={statusActionLoading}>
              Cancel
            </Button>
            <Button
              variant={confirmDetails?.actionType === "deactivate" ? "danger" : "default"}
              onClick={() => confirmDetails?.groupId && handleToggleStatus(confirmDetails.groupId, confirmDetails.actionType)}
              disabled={statusActionLoading}
            >
              {statusActionLoading ? "Processing..." : confirmDetails?.actionType === "deactivate" ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD CONTACTS MODAL ── */}
      <Dialog open={addContactsOpen} onOpenChange={setAddContactsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contacts to Group</DialogTitle>
            <DialogDescription>
              Select contacts from your organization to add to "{drawerGroup?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>

            <div className="border border-border rounded-lg max-h-[300px] overflow-y-auto">
              {allContactsLoading ? (
                <div className="p-8 text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading contacts...</p>
                </div>
              ) : allContacts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No contacts found in organization.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allContacts
                    .filter(c => {
                      const isAlreadyInGroup = drawerContacts.some(dc => dc.id === c.id);
                      const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                        c.email.toLowerCase().includes(contactSearch.toLowerCase());
                      return !isAlreadyInGroup && matchesSearch;
                    })
                    .map((c) => {
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`contact-${c.id}`}
                            checked={selectedNewContactIds.has(c.id)}
                            onCheckedChange={(checked) => {
                              setSelectedNewContactIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(c.id);
                                else next.delete(c.id);
                                return next;
                              });
                            }}
                          />
                          <label
                            htmlFor={`contact-${c.id}`}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                          </label>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {selectedNewContactIds.size} contacts selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddContactsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkAddContacts}
                  disabled={selectedNewContactIds.size === 0 || isBulkAdding}
                >
                  {isBulkAdding ? "Adding..." : "Add to Group"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
