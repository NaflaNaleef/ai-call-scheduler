import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Trash2,
  Users,
  UserMinus,
  Filter,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Megaphone,
  Pencil,
  Eye,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// --- Types ---
type ContactStatus = "active" | "inactive" | "unsubscribed";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ContactStatus;
  groups: string[];
  createdAt: string;
  notes: string;
}

// --- Types ---

const statusVariant: Record<ContactStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  inactive: "neutral",
  unsubscribed: "warning",
};

const CONTACT_LIMIT = 10000;
const PAGE_SIZE = 10;

// --- Component ---
export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set()); // Group IDs
  const [groupFilteredIds, setGroupFilteredIds] = useState<Set<string> | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", phone: "", email: "", timezone: "" });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editingContactForm, setEditingContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "", timezone: "" });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [selectedNewContactGroupIds, setSelectedNewContactGroupIds] = useState<string[]>([]);
  const [groupsExpanded, setGroupsExpanded] = useState(false);

  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<{
    title: string;
    description: string;
    actionType: "deactivate" | "reactivate" | "bulk-deactivate";
    contactId?: string;
  } | null>(null);

  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"assign" | "remove" | null>(null);
  const [orgGroups, setOrgGroups] = useState<any[]>([]);
  const [selectedPickerGroupId, setSelectedPickerGroupId] = useState<string>("");
  const [bulkGroupLoading, setBulkGroupLoading] = useState(false);

  const [drawerContactGroups, setDrawerContactGroups] = useState<any[]>([]);
  const [drawerGroupsLoading, setDrawerGroupsLoading] = useState(false);

  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchContacts = async () => {
    if (!user?.org_id) {
      setContactsLoading(false);
      return;
    }
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("f_get_contacts", { p_org_id: user.org_id });
      if (error) {
        console.error("f_get_contacts error:", error.message);
        setContacts([]);
      } else {
        const mapped: Contact[] = (data ?? []).map((row: any) => {
          const firstName = row.first_name ?? "";
          const lastName = row.last_name ?? "";
          const name = [firstName, lastName].filter(Boolean).join(" ") || row.email;
          const status: ContactStatus = row.is_active === false ? "inactive" : "active";
          const createdAt = row.created_at
            ? new Date(row.created_at).toISOString().split("T")[0]
            : "";
          return {
            id: String(row.id ?? row.contact_id ?? Math.random()),
            name,
            email: row.email ?? "",
            phone: row.phone_number ?? "",
            status,
            groups: [],
            createdAt,
            notes: "",
          };
        });
        setContacts(mapped);
      }
    } catch (err) {
      console.error("f_get_contacts threw:", err);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchOrgGroups();
  }, [user?.org_id]);

  const fetchDrawerContactGroups = async (contactId: string) => {
    if (!user?.org_id) return;
    setDrawerGroupsLoading(true);
    try {
      // Try the preferred RPC first
      const { data: groupsData, error: groupsError } = await supabase.rpc("f_get_groups_by_contact_id", {
        p_contact_id: contactId
      });

      if (!groupsError && groupsData) {
        // Ensure data is mapped to include group_id and group_name if needed
        const mapped = (groupsData || []).map((g: any) => ({
          group_id: g.group_id || g.id,
          group_name: g.group_name || g.name
        }));
        setDrawerContactGroups(mapped);
      } else {
        console.log("f_get_groups_by_contact_id failed or missing, trying cross-reference...");
        // Cross-reference approach: Get all org groups and then memberships
        const [groupsRes, membersRes] = await Promise.all([
          supabase.rpc("f_get_contact_groups", { p_org_id: user.org_id }),
          supabase.from("contact_group_members").select("group_id").eq("contact_id", contactId)
        ]);

        if (groupsRes.error) throw groupsRes.error;
        if (membersRes.error) {
          console.warn("Could not query contact_group_members table directly:", membersRes.error.message);
          setDrawerContactGroups([]);
          return;
        }

        const memberGroupIds = new Set((membersRes.data || []).map((m: any) => String(m.group_id)));
        const contactGroups = (groupsRes.data || [])
          .filter((g: any) => memberGroupIds.has(String(g.id || g.group_id || g.contact_group_id)))
          .map((g: any) => ({
            group_id: g.id || g.group_id || g.contact_group_id,
            group_name: g.name
          }));

        setDrawerContactGroups(contactGroups);
      }
    } catch (err) {
      console.error("fetchDrawerContactGroups error:", err);
      setDrawerContactGroups([]);
    } finally {
      setDrawerGroupsLoading(false);
    }
  };

  const fetchCampaignHistory = async (contactId: string) => {
    if (!user?.org_id) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.rpc("f_get_org_call_logs", {
        p_org_id: user.org_id,
        p_limit: 1000 // Fetch a good chunk to filter client-side as requested
      });
      if (error) throw error;

      const filtered = (data || [])
        .filter((h: any) => String(h.contact_id) === String(contactId))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) // Map each call log to show campaign name, date (formatted), and status. Show max 5 most recent.
        .map((h: any) => ({
          name: h.campaign_name || "Unknown Campaign",
          date: h.created_at ? new Date(h.created_at).toLocaleDateString() : "—",
          status: h.status || "—"
        }));

      setCampaignHistory(filtered);
    } catch (err) {
      console.error("fetchCampaignHistory error:", err);
      setCampaignHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (drawerContact) {
      fetchDrawerContactGroups(drawerContact.id);
      fetchCampaignHistory(drawerContact.id);
    } else {
      setDrawerContactGroups([]);
      setCampaignHistory([]);
    }
  }, [drawerContact?.id]);

  const handleSaveContact = async () => {
    if (!user?.org_id || !user?.id) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const { data, error } = await supabase.rpc("f_create_contact", {
        p_org_id: user.org_id,
        p_first_name: newContact.firstName,
        p_last_name: newContact.lastName,
        p_phone_number: newContact.phone,
        p_email: newContact.email,
        p_created_by: user.dbId
      });

      if (error) {
        setSaveError(error.message);
      } else {
        const newContactId = Array.isArray(data) ? (data[0]?.id ?? data[0]) : (data?.id ?? data);

        // Task 2: Group assignment after creation
        if (selectedNewContactGroupIds.length > 0 && newContactId) {
          console.log(`Adding contact ${newContactId} to ${selectedNewContactGroupIds.length} groups...`);
          const groupPromises = selectedNewContactGroupIds.map(groupId =>
            supabase.rpc("f_add_contact_to_group", {
              p_group_id: groupId,
              p_contact_id: newContactId
            })
          );
          await Promise.all(groupPromises);

          // Trigger a re-fetch of f_get_contact_groups so the contact count in the groups list updates
          console.log("Refreshing groups for counts...");
          await fetchOrgGroups();

          // Signal to Group drawer (if open in another tab or component) to refresh its contacts
          window.dispatchEvent(new Event('refresh-group-drawer'));
        }

        setAddContactOpen(false);
        setNewContact({ firstName: "", lastName: "", phone: "", email: "", timezone: "" });
        setSelectedNewContactGroupIds([]);
        setGroupsExpanded(false);
        console.log("Contact created, refreshing list...");
        await fetchContacts();
      }
    } catch (err: any) {
      setSaveError(err.message || "An unexpected error occurred");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContactId) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const { error } = await supabase.rpc("f_update_contact", {
        p_id: editingContactId,
        p_first_name: editingContactForm.firstName,
        p_last_name: editingContactForm.lastName,
        p_phone_number: editingContactForm.phone,
        p_email: editingContactForm.email,
        p_timezone: editingContactForm.timezone,
      });

      if (error) {
        setEditError(error.message);
      } else {
        setEditContactOpen(false);
        console.log("Contact updated, refreshing list...");
        await fetchContacts();
      }
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (contactId: string, action: "deactivate" | "reactivate") => {
    setStatusActionLoading(true);
    try {
      const rpcName = action === "deactivate" ? "f_deactivate_contact" : "f_reactivate_contact";
      const { error } = await supabase.rpc(rpcName, { p_id: contactId });

      if (error) {
        console.error(`${rpcName} error:`, error.message);
        // We could add a toast or error state here if needed
      } else {
        await fetchContacts();
      }
    } catch (err) {
      console.error(`Status toggle failed:`, err);
    } finally {
      setStatusActionLoading(false);
      setConfirmDialogOpen(false);
      setConfirmDetails(null);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;

    setStatusActionLoading(true);
    try {
      // Loop through each ID as requested
      const promises = Array.from(selectedIds).map(id =>
        supabase.rpc("f_deactivate_contact", { p_id: id })
      );

      await Promise.all(promises);
      setSelectedIds(new Set());
      await fetchContacts();
    } catch (err) {
      console.error("Bulk deactivation failed:", err);
    } finally {
      setStatusActionLoading(false);
      setConfirmDialogOpen(false);
      setConfirmDetails(null);
      setDeleteDialogOpen(false); // Close the bulk delete dialog if it's open
    }
  };

  const fetchOrgGroups = async () => {
    if (!user?.org_id) return;
    try {
      const { data, error } = await supabase.rpc("f_get_contact_groups", { p_org_id: user.org_id });
      if (error) throw error;
      setOrgGroups(data || []);
    } catch (err) {
      console.error("fetchOrgGroups error:", err);
    }
  };

  useEffect(() => {
    const fetchGroupContactIds = async () => {
      if (groupFilter.size === 0) {
        setGroupFilteredIds(null);
        return;
      }

      setGroupLoading(true);
      try {
        const contactIdsSet = new Set<string>();
        const groupIds = Array.from(groupFilter);

        // Fetch contacts for all selected groups
        const promises = groupIds.map(id =>
          supabase.rpc('f_get_group_contacts', { p_group_id: id })
        );

        const results = await Promise.all(promises);

        results.forEach(({ data, error }) => {
          if (error) {
            console.error("f_get_group_contacts error:", error.message);
            return;
          }
          if (data) {
            data.forEach((row: any) => {
              const id = String(row.id ?? row.contact_id);
              if (id) contactIdsSet.add(id);
            });
          }
        });

        setGroupFilteredIds(contactIdsSet);
      } catch (err) {
        console.error("fetchGroupContactIds error:", err);
        setGroupFilteredIds(new Set()); // Empty list on error
      } finally {
        setGroupLoading(false);
      }
    };

    fetchGroupContactIds();
  }, [groupFilter]);

  const handleBulkGroupAction = async () => {
    if (!selectedPickerGroupId || selectedIds.size === 0 || !bulkActionType) return;

    setBulkGroupLoading(true);
    try {
      const isRemove = bulkActionType === "remove";
      const contactIdArray = Array.from(selectedIds);

      // Iterate only over the selected contact IDs
      const promises = contactIdArray.map(async (contactId) => {
        if (isRemove) {
          const { data, error } = (await supabase
            .rpc("f_remove_contact_from_group", {
              p_group_id: selectedPickerGroupId,
              p_contact_id: contactId,
            })
            .single()) as any;

          if (error) throw error;
          if (data && data.success === false) {
            console.warn(`f_remove_contact_from_group partial failure: ${data.message}`);
          }
          return data;
        } else {
          const { error } = await supabase.rpc("f_add_contact_to_group", {
            p_group_id: selectedPickerGroupId,
            p_contact_id: contactId,
          });
          if (error) throw error;
        }
      });

      await Promise.all(promises);
      setGroupPickerOpen(false);
      setSelectedIds(new Set());
      setSelectedPickerGroupId("");
      await fetchContacts();
    } catch (err: any) {
      console.error(`Bulk ${bulkActionType} failed:`, err.message);
    } finally {
      setBulkGroupLoading(false);
    }
  };

  const contactsUsed = contacts.length;

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchesGroup =
        groupFilteredIds === null || groupFilteredIds.has(c.id);
      return matchesSearch && matchesGroup;
    });
  }, [search, groupFilteredIds, contacts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelected = paginated.length > 0 && paginated.every((c) => selectedIds.has(c.id));
  const someSelected = filtered.some((c) => selectedIds.has(c.id));
  const selectedCount = filtered.filter((c) => selectedIds.has(c.id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroupFilter = (group: string) => {
    setGroupFilter((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  return (
    <DashboardLayout title="All Contacts">
      <div className="space-y-4">
        {/* Usage limit banners */}
        {contactsUsed >= CONTACT_LIMIT && (
          <AlertBanner
            variant="error"
            title="Contact limit reached"
            message={`You have reached your ${CONTACT_LIMIT.toLocaleString()} contact limit. Upgrade your plan to add more contacts.`}
          />
        )}
        {contactsUsed >= CONTACT_LIMIT * 0.8 && contactsUsed < CONTACT_LIMIT && (
          <AlertBanner
            variant="warning"
            title="Nearing contact limit"
            message={`You've used ${contactsUsed.toLocaleString()} of ${CONTACT_LIMIT.toLocaleString()} contacts. Upgrade before reaching your limit.`}
            dismissible
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Manage your contact list</p>
          <Button
            size="sm"
            disabled={contactsUsed >= CONTACT_LIMIT}
            title={contactsUsed >= CONTACT_LIMIT ? "Contact limit reached — upgrade your plan" : undefined}
            onClick={() => {
              setNewContact({ firstName: "", lastName: "", phone: "", email: "", timezone: "" });
              setSelectedNewContactGroupIds([]);
              setGroupsExpanded(false);
              setAddContactOpen(true);
              setSaveError(null);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Contact
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-sm flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Groups
                {groupFilter.size > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {groupFilter.size}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
              {orgGroups.map((group) => (
                <DropdownMenuCheckboxItem
                  key={group.id}
                  checked={groupFilter.has(group.id)}
                  onCheckedChange={() => toggleGroupFilter(group.id)}
                >
                  {group.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 animate-fade-in">
            <span className="text-sm font-medium text-foreground">
              {selectedCount} selected
            </span>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contactsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-muted animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-muted animate-pulse" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-28 rounded bg-muted animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-muted animate-pulse" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No contacts found"
                      description={search ? "Try adjusting your search or filter." : "Add your first contact to get started."}
                      icon={<Users className="h-6 w-6" />}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((contact) => {
                  const isSelected = selectedIds.has(contact.id);
                  return (
                    <tr
                      key={contact.id}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors duration-150 cursor-pointer",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => setDrawerContact(contact)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(contact.id)}
                          aria-label={`Select ${contact.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{contact.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{contact.phone}</td>
                      <td className="px-4 py-3">
                        <div onClick={(e) => e.stopPropagation()} className="inline-block align-middle">
                          <Switch
                            className="data-[state=checked]:bg-green-600"
                            checked={contact.status === "active"}
                            onCheckedChange={() => {
                              if (contact.status === "active") {
                                setConfirmDetails({
                                  title: "Deactivate Contact",
                                  description: `Are you sure you want to deactivate ${contact.name}?`,
                                  actionType: "deactivate",
                                  contactId: contact.id
                                });
                              } else {
                                setConfirmDetails({
                                  title: "Reactivate Contact",
                                  description: `Are you sure you want to reactivate ${contact.name}?`,
                                  actionType: "reactivate",
                                  contactId: contact.id
                                });
                              }
                              setConfirmDialogOpen(true);
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerContact(contact);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nameParts = contact.name.trim().split(" ");
                              const lastName = nameParts.length > 1 ? nameParts.pop() || "" : "";
                              const firstName = nameParts.join(" ");

                              setEditingContactId(contact.id);
                              setEditingContactForm({
                                firstName: firstName || contact.name,
                                lastName: lastName,
                                phone: contact.phone,
                                email: contact.email,
                                timezone: "",
                              });
                              setEditError(null);
                              setEditContactOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Contact Detail Drawer */}
      <Sheet open={!!drawerContact} onOpenChange={(open) => !open && setDrawerContact(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          {drawerContact && (
            <>
              <SheetHeader>
                <SheetTitle>{drawerContact.name}</SheetTitle>
                <SheetDescription>Contact details</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Details */}
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      {drawerContact.email}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      {drawerContact.phone}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      Added {drawerContact.createdAt}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={statusVariant[drawerContact.status]}>
                        {drawerContact.status}
                      </StatusBadge>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Group Memberships */}
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Memberships</h4>
                  {drawerGroupsLoading ? (
                    <div className="flex gap-2 animate-pulse">
                      <div className="h-5 w-16 bg-muted rounded-full" />
                      <div className="h-5 w-20 bg-muted rounded-full" />
                    </div>
                  ) : drawerContactGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No groups assigned.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {drawerContactGroups.map((g) => (
                        <StatusBadge key={g.group_id} variant="neutral">
                          {g.group_name}
                        </StatusBadge>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />
                {/* Campaign History */}
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign History</h4>
                  {historyLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-10 bg-muted rounded-md w-full" />
                      <div className="h-10 bg-muted rounded-md w-full" />
                    </div>
                  ) : campaignHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg">No campaign history yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {campaignHistory.map((c, idx) => (
                        <div
                          key={`${c.name}-${idx}`}
                          className="flex items-center justify-between text-sm py-2.5 px-3 rounded-md bg-muted/50 border border-border"
                        >
                          <div className="flex items-center gap-2 max-w-[60%]">
                            <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{c.date}</span>
                            <StatusBadge variant={
                              c.status.toUpperCase() === 'ANSWERED' || c.status.toLowerCase() === 'completed'
                                ? 'success'
                                : c.status.toUpperCase() === 'FAILED'
                                  ? 'warning'
                                  : 'neutral'
                            }>
                              {c.status.toLowerCase()}
                            </StatusBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Notes */}
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {drawerContact.notes || <span className="text-muted-foreground italic">No notes yet.</span>}
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Contact Dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Fill in the details below to add a new contact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {saveError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in zoom-in">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ac-first-name">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="ac-first-name"
                  placeholder="Jane"
                  value={newContact.firstName}
                  disabled={saveLoading}
                  onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-last-name">Last Name</Label>
                <Input
                  id="ac-last-name"
                  placeholder="Doe"
                  value={newContact.lastName}
                  disabled={saveLoading}
                  onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="ac-phone"
                placeholder="+1234567890"
                value={newContact.phone}
                disabled={saveLoading}
                onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-email">Email</Label>
              <Input
                id="ac-email"
                type="email"
                placeholder="jane@example.com"
                value={newContact.email}
                className={newContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={saveLoading}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
              />
              {newContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email) && (
                <p className="text-xs text-destructive">Please enter a valid email address.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-timezone">Timezone</Label>
              <Input
                id="ac-timezone"
                placeholder="e.g. America/New_York"
                value={newContact.timezone}
                disabled={saveLoading}
                onChange={(e) => setNewContact((p) => ({ ...p, timezone: e.target.value }))}
              />
            </div>

            {/* Task 2: Group Assignment section */}
            <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
                onClick={() => setGroupsExpanded(!groupsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Add to groups <span className="text-xs text-muted-foreground font-normal">(optional)</span></span>
                </div>
                {groupsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {groupsExpanded && (
                <div className="p-3 bg-card border-t border-border max-h-[160px] overflow-y-auto space-y-2 animate-in slide-in-from-top-2 duration-200">
                  {orgGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No groups available.</p>
                  ) : (
                    orgGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedNewContactGroupIds.includes(group.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedNewContactGroupIds(prev => [...prev, group.id]);
                              } else {
                                setSelectedNewContactGroupIds(prev => prev.filter(id => id !== group.id));
                              }
                            }}
                          />
                          <Label htmlFor={`group-${group.id}`} className="text-sm font-normal cursor-pointer">
                            {group.name}
                          </Label>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {group.contact_count || 0}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)} disabled={saveLoading}>Cancel</Button>
            <Button
              disabled={
                !newContact.firstName.trim() ||
                !newContact.phone.trim() ||
                saveLoading ||
                (newContact.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email))
              }
              onClick={handleSaveContact}
            >
              {saveLoading ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact's information below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-first-name">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="ec-first-name"
                  placeholder="Jane"
                  value={editingContactForm.firstName}
                  disabled={editLoading}
                  onChange={(e) => setEditingContactForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-last-name">Last Name</Label>
                <Input
                  id="ec-last-name"
                  placeholder="Doe"
                  value={editingContactForm.lastName}
                  disabled={editLoading}
                  onChange={(e) => setEditingContactForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="ec-phone"
                placeholder="+1234567890"
                value={editingContactForm.phone}
                disabled={editLoading}
                onChange={(e) => setEditingContactForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-email">Email</Label>
              <Input
                id="ec-email"
                type="email"
                placeholder="jane@example.com"
                value={editingContactForm.email}
                className={editingContactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingContactForm.email) ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={editLoading}
                onChange={(e) => setEditingContactForm((p) => ({ ...p, email: e.target.value }))}
              />
              {editingContactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingContactForm.email) && (
                <p className="text-xs text-destructive">Please enter a valid email address.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-timezone">Timezone</Label>
              <Input
                id="ec-timezone"
                placeholder="e.g. America/New_York"
                value={editingContactForm.timezone}
                disabled={editLoading}
                onChange={(e) => setEditingContactForm((p) => ({ ...p, timezone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContactOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button
              disabled={
                !editingContactForm.firstName.trim() ||
                !editingContactForm.phone.trim() ||
                editLoading ||
                (editingContactForm.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingContactForm.email))
              }
              onClick={handleUpdateContact}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (Single & Bulk) */}
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
              variant={confirmDetails?.actionType === "reactivate" ? "default" : "danger"}
              disabled={statusActionLoading}
              onClick={() => {
                if (confirmDetails?.actionType === "bulk-deactivate") {
                  handleBulkDeactivate();
                } else if (confirmDetails?.contactId) {
                  handleToggleStatus(confirmDetails.contactId, confirmDetails.actionType as any);
                }
              }}
            >
              {statusActionLoading ? "Processing..." : confirmDetails?.actionType === "reactivate" ? "Reactivate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (Bulk) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedCount} contact{selectedCount !== 1 && "s"}? They will be marked as inactive but not permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={statusActionLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={statusActionLoading}
              onClick={handleBulkDeactivate}
            >
              {statusActionLoading ? "Processing..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Picker Modal */}
      <Dialog open={groupPickerOpen} onOpenChange={setGroupPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === "assign" ? "Assign to Group" : "Remove from Group"}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === "assign"
                ? `Select a group to assign the ${selectedCount} selected contact${selectedCount !== 1 ? 's' : ''} to.`
                : `Select a group to remove the ${selectedCount} selected contact${selectedCount !== 1 ? 's' : ''} from.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="group-select" className="mb-2 block">Select Group</Label>
            <Select
              value={selectedPickerGroupId}
              onValueChange={setSelectedPickerGroupId}
            >
              <SelectTrigger id="group-select">
                <SelectValue placeholder="Select a group..." />
              </SelectTrigger>
              <SelectContent>
                {orgGroups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupPickerOpen(false)} disabled={bulkGroupLoading}>
              Cancel
            </Button>
            <Button
              disabled={!selectedPickerGroupId || bulkGroupLoading}
              onClick={handleBulkGroupAction}
            >
              {bulkGroupLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
