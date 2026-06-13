import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBillingAdminConfig, saveBillingCoupon, saveBillingPlan } from "@/lib/billing.functions";
import { getPlatformAdminOverview } from "@/lib/platform-admin.functions";
import { Building2, CheckCircle2, CreditCard, Gift, Loader2, Phone, RefreshCw, Save, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({ component: PlatformAdmin });

type Overview = Awaited<ReturnType<typeof getPlatformAdminOverview>>;
type BillingConfig = Awaited<ReturnType<typeof getBillingAdminConfig>>;
type AdminPlan = BillingConfig["plans"][number];
type AdminCoupon = BillingConfig["coupons"][number];

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

function toCents(value: string) {
  return Math.round((Number(value) || 0) * 100);
}

function fromCents(value: number) {
  return String(Math.round(value) / 100);
}

function BillingInput({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PlanEditor({
  plan,
  saving,
  onChange,
  onSave,
}: {
  plan: AdminPlan;
  saving: boolean;
  onChange: (plan: AdminPlan) => void;
  onSave: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {currency.format(plan.monthlyPrice)} / month, estimated {plan.grossMarginPercent}% margin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Active</Label>
          <Switch checked={plan.active} onCheckedChange={(active) => onChange({ ...plan, active })} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BillingInput label="Plan code" value={plan.code} onChange={(code) => onChange({ ...plan, code })} />
        <BillingInput label="Name" value={plan.name} onChange={(name) => onChange({ ...plan, name })} />
        <BillingInput label="Monthly price" type="number" step="1" value={fromCents(plan.monthlyPriceCents)} onChange={(value) => onChange({ ...plan, monthlyPriceCents: toCents(value) })} />
        <BillingInput label="Stripe Price ID" value={plan.stripePriceId ?? ""} onChange={(stripePriceId) => onChange({ ...plan, stripePriceId })} />
        <BillingInput label="Included AI minutes" type="number" value={plan.includedCallMinutes} onChange={(value) => onChange({ ...plan, includedCallMinutes: Number(value) || 0 })} />
        <BillingInput label="Included SMS segments" type="number" value={plan.includedSmsSegments} onChange={(value) => onChange({ ...plan, includedSmsSegments: Number(value) || 0 })} />
        <BillingInput label="Estimated AI minutes" type="number" value={plan.estimatedAiMinutes} onChange={(value) => onChange({ ...plan, estimatedAiMinutes: Number(value) || 0 })} />
        <BillingInput label="Estimated SMS segments" type="number" value={plan.estimatedSmsSegments} onChange={(value) => onChange({ ...plan, estimatedSmsSegments: Number(value) || 0 })} />
        <BillingInput label="AI cost/minute (cents)" type="number" step="0.001" value={plan.costPerAiMinuteCents} onChange={(value) => onChange({ ...plan, costPerAiMinuteCents: Number(value) || 0 })} />
        <BillingInput label="SMS cost/segment (cents)" type="number" step="0.001" value={plan.costPerSmsSegmentCents} onChange={(value) => onChange({ ...plan, costPerSmsSegmentCents: Number(value) || 0 })} />
        <BillingInput label="Phone number cost" type="number" step="1" value={fromCents(plan.phoneNumberMonthlyCents)} onChange={(value) => onChange({ ...plan, phoneNumberMonthlyCents: toCents(value) })} />
        <BillingInput label="Platform buffer" type="number" step="1" value={fromCents(plan.platformBufferCents)} onChange={(value) => onChange({ ...plan, platformBufferCents: toCents(value) })} />
        <BillingInput label="Overage/minute (cents)" type="number" value={plan.overageCallMinuteCents} onChange={(value) => onChange({ ...plan, overageCallMinuteCents: Number(value) || 0 })} />
        <BillingInput label="Overage/SMS (cents)" type="number" value={plan.overageSmsSegmentCents} onChange={(value) => onChange({ ...plan, overageSmsSegmentCents: Number(value) || 0 })} />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label>Description</Label>
        <Textarea value={plan.description} onChange={(e) => onChange({ ...plan, description: e.target.value })} />
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Features, one per line</Label>
        <Textarea value={plan.features.join("\n")} onChange={(e) => onChange({ ...plan, features: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-muted-foreground">Estimated monthly cost: </span>
          <span className="font-semibold">{currency.format(plan.estimatedCost)}</span>
          <span className="mx-2 text-muted-foreground">|</span>
          <span className="text-muted-foreground">Gross profit: </span>
          <span className="font-semibold">{currency.format(plan.grossProfit)}</span>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save plan
        </Button>
      </div>
    </Card>
  );
}

function PlatformAdmin() {
  const overviewFn = useServerFn(getPlatformAdminOverview);
  const billingFn = useServerFn(getBillingAdminConfig);
  const savePlanFn = useServerFn(saveBillingPlan);
  const saveCouponFn = useServerFn(saveBillingCoupon);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [billing, setBilling] = useState<BillingConfig | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [coupon, setCoupon] = useState<Partial<AdminCoupon>>({
    code: "LAUNCH20",
    name: "Launch 20% off",
    percentOff: 20,
    active: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, billingData] = await Promise.all([overviewFn(), billingFn()]);
      setOverview(overviewData);
      setBilling(billingData);
      setPlans(billingData.plans);
      setCoupon(
        billingData.coupons[0] ?? {
          code: "LAUNCH20",
          name: "Launch 20% off",
          percentOff: 20,
          active: false,
        },
      );
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

  function updatePlan(index: number, next: AdminPlan) {
    setPlans((current) => current.map((plan, i) => (i === index ? next : plan)));
  }

  async function savePlan(plan: AdminPlan) {
    setSavingPlan(plan.code);
    try {
      await savePlanFn({
        data: {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          monthlyPriceCents: plan.monthlyPriceCents,
          includedCallMinutes: plan.includedCallMinutes,
          includedSmsSegments: plan.includedSmsSegments,
          estimatedAiMinutes: plan.estimatedAiMinutes,
          estimatedSmsSegments: plan.estimatedSmsSegments,
          costPerAiMinuteCents: plan.costPerAiMinuteCents,
          costPerSmsSegmentCents: plan.costPerSmsSegmentCents,
          phoneNumberMonthlyCents: plan.phoneNumberMonthlyCents,
          platformBufferCents: plan.platformBufferCents,
          overageCallMinuteCents: plan.overageCallMinuteCents,
          overageSmsSegmentCents: plan.overageSmsSegmentCents,
          stripePriceId: plan.stripePriceId,
          features: plan.features,
          active: plan.active,
          sortOrder: plan.sortOrder,
        },
      });
      toast.success(`${plan.name} plan saved`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Plan could not be saved.");
    } finally {
      setSavingPlan(null);
    }
  }

  async function saveCoupon() {
    setSavingCoupon(true);
    try {
      await saveCouponFn({
        data: {
          id: coupon.id ?? null,
          code: coupon.code ?? "",
          name: coupon.name ?? "",
          percentOff: coupon.amountOffCents ? null : coupon.percentOff ?? null,
          amountOffCents: coupon.amountOffCents ?? null,
          durationMonths: coupon.durationMonths ?? null,
          stripeCouponId: coupon.stripeCouponId ?? null,
          active: Boolean(coupon.active),
          maxRedemptions: coupon.maxRedemptions ?? null,
          expiresAt: coupon.expiresAt ?? null,
        },
      });
      toast.success("Coupon saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coupon could not be saved.");
    } finally {
      setSavingCoupon(false);
    }
  }

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

      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-6">
          {totals && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Tenants" value={totals.tenants} icon={Building2} />
              <MetricCard label="Open Leads" value={totals.openLeads} icon={Phone} />
              <MetricCard label="Recovered Calls" value={totals.recoveredCalls} icon={CheckCircle2} />
              <MetricCard label="Appointments" value={totals.appointments} icon={Users} />
              <MetricCard label="Est. Revenue" value={currency.format(totals.estimatedRevenue)} icon={TrendingUp} />
            </div>
          )}

          <Card className="overflow-hidden">
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
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Subscription pricing</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust plan pricing, included usage, and cost assumptions here. Stripe Price IDs are optional; without one, checkout creates an inline monthly price from this table.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {plans.map((plan, index) => (
              <PlanEditor
                key={`${plan.code}-${index}`}
                plan={plan}
                saving={savingPlan === plan.code}
                onChange={(next) => updatePlan(index, next)}
                onSave={() => savePlan(plan)}
              />
            ))}
          </div>

          <Card className="p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Coupon option</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create or update one app-level coupon. Tenants can type this code on the Billing page before checkout.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Active</Label>
                <Switch checked={Boolean(coupon.active)} onCheckedChange={(active) => setCoupon({ ...coupon, active })} />
              </div>
            </div>

            {billing?.coupons?.length ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {billing.coupons.map((item) => (
                  <Button key={item.id} variant={item.id === coupon.id ? "default" : "outline"} size="sm" onClick={() => setCoupon(item)}>
                    {item.code}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <BillingInput label="Code" value={coupon.code ?? ""} onChange={(code) => setCoupon({ ...coupon, code: code.toUpperCase() })} />
              <BillingInput label="Name" value={coupon.name ?? ""} onChange={(name) => setCoupon({ ...coupon, name })} />
              <BillingInput label="Percent off" type="number" value={coupon.percentOff ?? ""} onChange={(value) => setCoupon({ ...coupon, percentOff: value ? Number(value) : null, amountOffCents: null })} />
              <BillingInput label="Amount off" type="number" step="1" value={coupon.amountOffCents ? fromCents(coupon.amountOffCents) : ""} onChange={(value) => setCoupon({ ...coupon, amountOffCents: value ? toCents(value) : null, percentOff: null })} />
              <BillingInput label="Duration months" type="number" value={coupon.durationMonths ?? ""} onChange={(value) => setCoupon({ ...coupon, durationMonths: value ? Number(value) : null })} />
              <BillingInput label="Max redemptions" type="number" value={coupon.maxRedemptions ?? ""} onChange={(value) => setCoupon({ ...coupon, maxRedemptions: value ? Number(value) : null })} />
              <BillingInput label="Stripe Coupon ID" value={coupon.stripeCouponId ?? ""} onChange={(stripeCouponId) => setCoupon({ ...coupon, stripeCouponId })} />
              <BillingInput label="Expires at" value={coupon.expiresAt ?? ""} onChange={(expiresAt) => setCoupon({ ...coupon, expiresAt })} />
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={saveCoupon} disabled={savingCoupon}>
                {savingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save coupon
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
