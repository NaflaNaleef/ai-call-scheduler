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

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
