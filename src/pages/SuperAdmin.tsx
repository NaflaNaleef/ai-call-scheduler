import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface OrgSubscription {
  plan_id: string;
  status: string;
  current_period_end: string | null;
}

interface OrgUsage {
  calls_made: number;
  call_minutes_used: number;
  contacts_count: number;
  campaigns_count: number;
}

interface Organization {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  org_subscriptions: OrgSubscription[];
  org_usage: OrgUsage[];
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("organizations")
          .select(`
            id,
            name,
            email,
            is_active,
            created_at,
            org_subscriptions (
              plan_id,
              status,
              current_period_end
            ),
            org_usage (
              calls_made,
              call_minutes_used,
              contacts_count,
              campaigns_count
            )
          `);

        if (fetchError) throw fetchError;
        setOrgs((data as unknown as Organization[]) || []);
      } catch (err: any) {
        console.error("Error fetching organizations:", err);
        setError(err.message || "Failed to load organizations.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, []);

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
            Cross-org data requires a dedicated backend function. Currently showing your organization only. Full super admin view coming soon.
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
                  <TableHead className="text-right">Calls Made</TableHead>
                  <TableHead className="text-right">Minutes Used</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Campaigns</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orgs.map((org) => {
                    const sub = org.org_subscriptions?.[0];
                    const usage = org.org_usage?.[0];

                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name || "—"}</TableCell>
                        <TableCell>{org.email || "—"}</TableCell>
                        <TableCell className="capitalize">{sub?.plan_id || "—"}</TableCell>
                        <TableCell>
                          {sub?.status ? (
                            <span className="capitalize">{sub.status}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{usage?.calls_made?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell className="text-right">{usage?.call_minutes_used?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell className="text-right">{usage?.contacts_count?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell className="text-right">{usage?.campaigns_count?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{formatDate(sub?.current_period_end)}</TableCell>
                        <TableCell>
                          <StatusBadge variant={org.is_active ? "success" : "error"}>
                            {org.is_active ? "Active" : "Inactive"}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
