import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlatformAdminOverview } from "@/lib/platform-admin.functions";
import { Building2, CheckCircle2, Phone, RefreshCw, ShieldCheck, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: PlatformAdmin });

type Overview = Awaited<ReturnType<typeof getPlatformAdminOverview>>;

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatPhone(value: string | null) {
  if (!value) return "Not set";
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length !== 10) return value;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Building2 }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function PlatformAdmin() {
  const overviewFn = useServerFn(getPlatformAdminOverview);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await overviewFn();
      setOverview(data);
    } catch (e: any) {
      setError(e?.message ?? "Unable to load platform admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !overview) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading platform admin...</div>;
  }

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Platform admin</h1>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const totals = overview?.totals;
  const tenants = overview?.tenants ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Super Admin
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Tenant management</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Platform-level view of CallRecover tenants without changing each tenant's admin and staff permissions.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Tenants" value={totals.tenants} icon={Building2} />
          <MetricCard label="Open Leads" value={totals.openLeads} icon={Phone} />
          <MetricCard label="Recovered Calls" value={totals.recoveredCalls} icon={CheckCircle2} />
          <MetricCard label="Appointments" value={totals.appointments} icon={Users} />
          <MetricCard label="Est. Revenue" value={currency.format(totals.estimatedRevenue)} icon={TrendingUp} />
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Businesses</h2>
          <p className="mt-1 text-sm text-muted-foreground">Current tenants, setup state, lead volume, and assistant connection.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Recovered</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead>Vapi</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div className="font-medium">{tenant.businessName}</div>
                  <div className="text-xs capitalize text-muted-foreground">{tenant.contractorType?.replace(/_/g, " ") ?? "No type"}</div>
                </TableCell>
                <TableCell>
                  <div className="max-w-44 truncate">{tenant.ownerEmail ?? "Owner email unavailable"}</div>
                  <div className="text-xs text-muted-foreground">{tenant.memberCount} account member{tenant.memberCount === 1 ? "" : "s"}</div>
                </TableCell>
                <TableCell>
                  <div>{formatPhone(tenant.businessPhone)}</div>
                  <div className="text-xs text-muted-foreground">Owner: {formatPhone(tenant.ownerPhone)}</div>
                </TableCell>
                <TableCell>
                  {tenant.onboardingComplete ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ready</Badge>
                  ) : (
                    <Badge variant="secondary">Onboarding</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">{tenant.openLeadCount}</div>
                  <div className="text-xs text-muted-foreground">{tenant.archivedLeadCount} archived</div>
                </TableCell>
                <TableCell className="text-right">{tenant.recoveredCallCount}</TableCell>
                <TableCell className="text-right">{currency.format(tenant.estimatedRevenue)}</TableCell>
                <TableCell>
                  {tenant.assistantConnected ? (
                    <div>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Connected</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">{formatPhone(tenant.vapiNumber)}</div>
                    </div>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDate(tenant.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!tenants.length && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  No tenants yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
