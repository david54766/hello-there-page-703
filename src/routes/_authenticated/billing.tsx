import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createStripeCheckoutSession, listBillingPlans } from "@/lib/billing.functions";
import { CheckCircle2, CreditCard, Gift, Loader2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({ component: Billing });

type BillingData = Awaited<ReturnType<typeof listBillingPlans>>;
type Plan = BillingData["plans"][number];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function cents(value: number) {
  return currency.format(value / 100);
}

function formatMinutes(seconds: number) {
  const minutes = Math.ceil(Math.max(0, seconds) / 60);
  return `${minutes} min`;
}

function marginTone(margin: number) {
  if (margin >= 60) return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  if (margin >= 45) return "bg-amber-100 text-amber-900 hover:bg-amber-100";
  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function PlanCard({
  plan,
  current,
  couponCode,
  busy,
  onSelect,
}: {
  plan: Plan;
  current: boolean;
  couponCode: string;
  busy: string | null;
  onSelect: (planCode: string) => void;
}) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
            {current && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Current</Badge>}
          </div>
          <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-semibold tracking-tight">{cents(plan.monthlyPriceCents)}</span>
          <span className="pb-1 text-sm text-muted-foreground">/mo</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="font-semibold">{plan.includedCallMinutes}</div>
            <div className="text-muted-foreground">AI minutes</div>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="font-semibold">{plan.includedSmsSegments}</div>
            <div className="text-muted-foreground">SMS segments</div>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="space-y-3 text-sm">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border bg-card p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Estimated cost basis</span>
          <span className="font-semibold">{cents(plan.estimatedCostCents)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Gross margin</span>
          <Badge className={marginTone(plan.grossMarginPercent)}>{plan.grossMarginPercent}%</Badge>
        </div>
      </div>

      <Button className="mt-6 w-full" disabled={busy !== null || current} onClick={() => onSelect(plan.code)}>
        {busy === plan.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {current ? "Current plan" : couponCode.trim() ? "Checkout with coupon" : "Start checkout"}
      </Button>
    </Card>
  );
}

function Billing() {
  const listPlans = useServerFn(listBillingPlans);
  const checkout = useServerFn(createStripeCheckoutSession);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await listPlans());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load billing plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedPlans = useMemo(() => data?.plans ?? [], [data]);
  const currentCode = data?.business?.subscriptionPlanCode ?? null;

  async function startCheckout(planCode: string) {
    setBusy(planCode);
    try {
      const result = await checkout({
        data: {
          planCode,
          couponCode: couponCode.trim() ? couponCode.trim() : null,
        },
      });
      if (!result.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.href = result.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Stripe checkout.");
      setBusy(null);
    }
  }

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading billing...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:py-10 md:pb-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Stripe billing
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Subscription</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose the plan that matches call volume. Usage estimates include Vapi AI minutes, Twilio SMS, phone number cost, and a platform buffer.
          </p>
        </div>
        <Card className="p-4 lg:min-w-80">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4 text-primary" />
            Coupon code
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="LAUNCH20" />
            <Button variant="outline" onClick={() => setCouponCode("")} disabled={!couponCode}>
              Clear
            </Button>
          </div>
        </Card>
      </div>

      {data?.business && (
        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-muted-foreground">Current account</Label>
              <p className="mt-1 text-lg font-semibold">{data.business.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {data.business.subscriptionStatus?.replace(/_/g, " ") ?? "Not started"}
              </Badge>
              {currentCode && <Badge className="capitalize">{currentCode}</Badge>}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border bg-muted/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">Trial call time</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatMinutes(data.business.trialCallSecondsRemaining)} remaining of{" "}
                  {formatMinutes(data.business.trialCallSecondsLimit)} included.
                </div>
              </div>
              <Badge
                className={
                  data.business.subscriptionStatus === "trial_exhausted"
                    ? "bg-red-100 text-red-800 hover:bg-red-100"
                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                }
              >
                {data.business.subscriptionStatus === "trial_exhausted" ? "Trial exhausted" : "15-minute trial"}
              </Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (data.business.trialCallSecondsUsed /
                        Math.max(1, data.business.trialCallSecondsLimit)) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {sortedPlans.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            current={currentCode === plan.code}
            couponCode={couponCode}
            busy={busy}
            onSelect={startCheckout}
          />
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Pricing is adjustable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Super admins can change plan prices, allowances, cost assumptions, Stripe Price IDs, and coupon availability from the Admin billing controls.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
