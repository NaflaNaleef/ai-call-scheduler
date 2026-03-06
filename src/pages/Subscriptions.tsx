import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  CreditCard,
  Download,
  RefreshCw,
  AlertTriangle,
  Zap,
  Building2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type PlanName = "Free" | "Pro" | "Business";
type PlanStatus = "Active" | "Trial" | "Canceled";

interface Plan {
  name: PlanName;
  price: string;
  priceNum: number;
  contactLimit: number;
  campaignLimit: number;
  callMinutes: number;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  icon: React.ElementType;
}

interface BillingRecord {
  id: string;
  plan: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  date: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    priceNum: 0,
    contactLimit: 500,
    campaignLimit: 3,
    callMinutes: 60,
    prioritySupport: false,
    advancedAnalytics: false,
    icon: Zap,
  },
  {
    name: "Pro",
    price: "$79",
    priceNum: 79,
    contactLimit: 10000,
    campaignLimit: 50,
    callMinutes: 5000,
    prioritySupport: true,
    advancedAnalytics: true,
    icon: Sparkles,
  },
  {
    name: "Business",
    price: "$199",
    priceNum: 199,
    contactLimit: 100000,
    campaignLimit: 999,
    callMinutes: 25000,
    prioritySupport: true,
    advancedAnalytics: true,
    icon: Building2,
  },
];

const mockBilling: BillingRecord[] = [
  { id: "INV-2026-02", plan: "Pro", amount: "$79.00", status: "paid", date: "2026-02-01" },
  { id: "INV-2026-01", plan: "Pro", amount: "$79.00", status: "paid", date: "2026-01-01" },
  { id: "INV-2025-12", plan: "Pro", amount: "$79.00", status: "paid", date: "2025-12-01" },
  { id: "INV-2025-11", plan: "Starter", amount: "$29.00", status: "paid", date: "2025-11-01" },
  { id: "INV-2025-10", plan: "Starter", amount: "$29.00", status: "failed", date: "2025-10-01" },
  { id: "INV-2025-10B", plan: "Starter", amount: "$29.00", status: "paid", date: "2025-10-05" },
];

const BILLING_PAGE_SIZE = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

function usageColor(pct: number) {
  if (pct >= 100) return "text-destructive";
  if (pct >= 80) return "text-warning";
  return "text-muted-foreground";
}

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-primary";
}

// A thin styled progress bar that supports color override
function UsageBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = progressColor(pct);
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full transition-all duration-500 rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const billingStatusVariant: Record<BillingRecord["status"], "success" | "warning" | "error"> = {
  paid: "success",
  pending: "warning",
  failed: "error",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { toast } = useToast();

  // Current plan state
  const [currentPlan, setCurrentPlan] = useState<PlanName>("Pro");
  const [planStatus] = useState<PlanStatus>("Active");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<PlanName | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [billingPage, setBillingPage] = useState(1);

  const planData = plans.find((p) => p.name === currentPlan)!;
  const isFree = currentPlan === "Free";

  // Mock usage values
  const usage = {
    contacts: { used: 8342, limit: planData.contactLimit },
    runs: { used: 41, limit: planData.campaignLimit },
    minutes: { used: 4120, limit: planData.callMinutes },
  };

  const contactsPct = Math.round((usage.contacts.used / usage.contacts.limit) * 100);
  const runsPct = Math.round((usage.runs.used / usage.runs.limit) * 100);
  const minutesPct = Math.round((usage.minutes.used / usage.minutes.limit) * 100);

  // Billing table
  const billingData = isFree ? [] : mockBilling;
  const totalBillingPages = Math.max(1, Math.ceil(billingData.length / BILLING_PAGE_SIZE));
  const billingPaginated = billingData.slice(
    (billingPage - 1) * BILLING_PAGE_SIZE,
    billingPage * BILLING_PAGE_SIZE
  );

  function handleUpgrade(planName: PlanName) {
    setUpgradeTarget(planName);
    setUpgradeLoading(true);
    setTimeout(() => {
      setCurrentPlan(planName);
      setUpgradeLoading(false);
      setUpgradeModalOpen(false);
      setSuccessBanner(true);
    }, 1200);
  }

  function handleCancelConfirm() {
    setCancelModalOpen(false);
    toast({ title: "Subscription canceled", description: "Your plan will remain active until the end of the billing period." });
  }

  const billingColumns = [
    {
      key: "id",
      header: "Invoice ID",
      render: (item: BillingRecord) => (
        <span className="font-mono text-xs">{item.id}</span>
      ),
    },
    { key: "plan", header: "Plan" },
    { key: "amount", header: "Amount" },
    {
      key: "status",
      header: "Status",
      render: (item: BillingRecord) => (
        <StatusBadge variant={billingStatusVariant[item.status]}>{item.status}</StatusBadge>
      ),
    },
    { key: "date", header: "Billing Date" },
    {
      key: "download",
      header: "",
      render: (_item: BillingRecord) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            toast({ title: "Invoice download coming soon" });
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Subscriptions">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Manage your plan, usage, and billing history.</p>

        {successBanner && (
          <AlertBanner
            variant="success"
            title="Plan updated successfully"
            message={`You are now on the ${currentPlan} plan.`}
            dismissible
          />
        )}

        {/* ── CURRENT PLAN CARD ─────────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold">{currentPlan} Plan</h3>
                <StatusBadge variant={planStatus === "Active" ? "success" : planStatus === "Trial" ? "info" : "error"}>
                  {planStatus}
                </StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isFree ? "Free forever" : `Renews on March 1, 2026 · ${planData.price}/mo`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => { setSuccessBanner(false); setUpgradeModalOpen(true); }}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {isFree ? "Upgrade Plan" : "Change Plan"}
              </Button>
              {!isFree && (
                <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(true)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Usage bars */}
          <div className="space-y-4">
            {/* Contacts */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Contacts</span>
                <span className={`text-xs font-medium tabular-nums ${usageColor(contactsPct)}`}>
                  {contactsPct >= 80 && contactsPct < 100 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {usage.contacts.used.toLocaleString()} / {usage.contacts.limit.toLocaleString()}
                  {contactsPct >= 100 && " — Limit reached!"}
                  {contactsPct >= 80 && contactsPct < 100 && " — Nearing limit"}
                </span>
              </div>
              <UsageBar value={usage.contacts.used} max={usage.contacts.limit} />
            </div>

            {/* Campaign Runs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Campaign Runs</span>
                <span className={`text-xs font-medium tabular-nums ${usageColor(runsPct)}`}>
                  {runsPct >= 80 && runsPct < 100 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {usage.runs.used} / {usage.runs.limit}
                  {runsPct >= 100 && " — Limit reached!"}
                  {runsPct >= 80 && runsPct < 100 && " — Nearing limit"}
                </span>
              </div>
              <UsageBar value={usage.runs.used} max={usage.runs.limit} />
            </div>

            {/* Call Minutes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Call Minutes</span>
                <span className={`text-xs font-medium tabular-nums ${usageColor(minutesPct)}`}>
                  {minutesPct >= 80 && minutesPct < 100 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {usage.minutes.used.toLocaleString()} / {usage.minutes.limit.toLocaleString()} min
                  {minutesPct >= 100 && " — Limit reached!"}
                  {minutesPct >= 80 && minutesPct < 100 && " — Nearing limit"}
                </span>
              </div>
              <UsageBar value={usage.minutes.used} max={usage.minutes.limit} />
            </div>
          </div>
        </div>

        {/* ── BILLING HISTORY ───────────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-base font-semibold">Billing History</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Download invoices for your records.</p>
          </div>
          <div className="p-6">
            {isFree || billingData.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="No billing history"
                description="You are on the Free plan. Upgrade to a paid plan to see your billing history and download invoices."
                action={
                  <Button size="sm" onClick={() => { setSuccessBanner(false); setUpgradeModalOpen(true); }}>
                    Upgrade Plan
                  </Button>
                }
              />
            ) : (
              <>
                <DataTable
                  columns={billingColumns}
                  data={billingPaginated}
                  keyExtractor={(b) => b.id}
                />
                <PaginationBar
                  page={billingPage}
                  totalPages={totalBillingPages}
                  onPageChange={setBillingPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── UPGRADE PLAN MODAL ────────────────────────────────────────────── */}
      <Dialog open={upgradeModalOpen} onOpenChange={(o) => !upgradeLoading && setUpgradeModalOpen(o)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>Select the plan that best fits your team's needs.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
            {plans.map((plan) => {
              const isCurrent = plan.name === currentPlan;
              const isLoading = upgradeLoading && upgradeTarget === plan.name;
              const PlanIcon = plan.icon;

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border p-5 flex flex-col transition-shadow duration-150 hover:shadow-md ${
                    plan.name === "Pro"
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  } ${isCurrent ? "bg-muted/30" : "bg-card"}`}
                >
                  {plan.name === "Pro" && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide">
                      MOST POPULAR
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PlanIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold">{plan.name}</span>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-semibold">{plan.price}</span>
                    {plan.priceNum > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {[
                      `${plan.contactLimit >= 100000 ? "Unlimited" : plan.contactLimit.toLocaleString()} contacts`,
                      `${plan.campaignLimit >= 999 ? "Unlimited" : plan.campaignLimit} campaigns`,
                      `${plan.callMinutes >= 25000 ? "Unlimited" : plan.callMinutes.toLocaleString()} call minutes`,
                      plan.prioritySupport ? "Priority support" : "Email support",
                      plan.advancedAnalytics ? "Advanced analytics" : "Basic analytics",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || upgradeLoading}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-current border-r-transparent rounded-full animate-spin" />
                        Upgrading…
                      </span>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Switch to ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CANCEL CONFIRM MODAL ──────────────────────────────────────────── */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your <span className="font-semibold text-foreground">{currentPlan}</span> plan?
              You'll retain access until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>Keep Plan</Button>
            <Button variant="danger" onClick={handleCancelConfirm}>Cancel Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
