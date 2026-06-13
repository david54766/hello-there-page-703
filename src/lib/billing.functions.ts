import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getFirstServerEnv } from "@/lib/env.server";

type PlanRow = {
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  included_call_minutes: number;
  included_sms_segments: number;
  estimated_ai_minutes: number;
  estimated_sms_segments: number;
  cost_per_ai_minute_cents: number | string;
  cost_per_sms_segment_cents: number | string;
  phone_number_monthly_cents: number;
  platform_buffer_cents: number;
  overage_call_minute_cents: number;
  overage_sms_segment_cents: number;
  stripe_price_id: string | null;
  features: string[] | unknown;
  active: boolean;
  sort_order: number;
};

type CouponRow = {
  id: string;
  code: string;
  name: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  duration_months: number | null;
  stripe_coupon_id: string | null;
  active: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
};

const admin = supabaseAdmin as any;

function dollars(cents: number) {
  return Math.round(cents) / 100;
}

function normalizeFeatures(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function estimateCostCents(plan: PlanRow) {
  const aiCost = plan.estimated_ai_minutes * Number(plan.cost_per_ai_minute_cents);
  const smsCost = plan.estimated_sms_segments * Number(plan.cost_per_sms_segment_cents);
  return Math.round(aiCost + smsCost + plan.phone_number_monthly_cents + plan.platform_buffer_cents);
}

function normalizePlan(plan: PlanRow) {
  const estimatedCostCents = estimateCostCents(plan);
  const grossProfitCents = plan.monthly_price_cents - estimatedCostCents;
  const grossMarginPercent = plan.monthly_price_cents
    ? Math.round((grossProfitCents / plan.monthly_price_cents) * 100)
    : 0;

  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    monthlyPriceCents: plan.monthly_price_cents,
    monthlyPrice: dollars(plan.monthly_price_cents),
    includedCallMinutes: plan.included_call_minutes,
    includedSmsSegments: plan.included_sms_segments,
    estimatedAiMinutes: plan.estimated_ai_minutes,
    estimatedSmsSegments: plan.estimated_sms_segments,
    costPerAiMinuteCents: Number(plan.cost_per_ai_minute_cents),
    costPerSmsSegmentCents: Number(plan.cost_per_sms_segment_cents),
    phoneNumberMonthlyCents: plan.phone_number_monthly_cents,
    platformBufferCents: plan.platform_buffer_cents,
    overageCallMinuteCents: plan.overage_call_minute_cents,
    overageSmsSegmentCents: plan.overage_sms_segment_cents,
    stripePriceId: plan.stripe_price_id,
    features: normalizeFeatures(plan.features),
    active: plan.active,
    sortOrder: plan.sort_order,
    estimatedCostCents,
    estimatedCost: dollars(estimatedCostCents),
    grossProfitCents,
    grossProfit: dollars(grossProfitCents),
    grossMarginPercent,
  };
}

function normalizeCoupon(coupon: CouponRow) {
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    percentOff: coupon.percent_off,
    amountOffCents: coupon.amount_off_cents,
    durationMonths: coupon.duration_months,
    stripeCouponId: coupon.stripe_coupon_id,
    active: coupon.active,
    maxRedemptions: coupon.max_redemptions,
    redemptionCount: coupon.redemption_count,
    expiresAt: coupon.expires_at,
  };
}

async function assertPlatformAdmin(userId: string) {
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify platform admin access: ${error.message}`);
  if (!data?.user_id) throw new Error("Not authorized for platform admin access.");
}

async function getBusinessForUser(supabase: any) {
  const { data: membership } = await supabase.from("business_members").select("business_id").limit(1).maybeSingle();
  const businessId = membership?.business_id;
  if (!businessId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("id, business_name, owner_id, subscription_plan_code, subscription_status, stripe_customer_id, stripe_subscription_id, subscription_current_period_end, trial_call_seconds_limit")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: usedSeconds, error: usageError } = await supabase.rpc("business_trial_call_seconds", {
    _business_id: businessId,
  });
  if (usageError) throw new Error(usageError.message);

  const limit = Number((data as any).trial_call_seconds_limit ?? 900);
  const used = Number(usedSeconds ?? 0);
  return {
    ...data,
    trial_call_seconds_used: used,
    trial_call_seconds_remaining: Math.max(0, limit - used),
  };
}

function stripeSecretKey() {
  const key = getFirstServerEnv(["STRIPE_SECRET_KEY", "CALLRECOVER_STRIPE_SECRET_KEY"]);
  if (!key) {
    throw new Error("Missing Stripe secret. Add STRIPE_SECRET_KEY in Lovable Secrets before starting checkout.");
  }
  return key;
}

function publicBaseUrl() {
  return (
    getFirstServerEnv(["CALLRECOVER_PUBLIC_URL", "PUBLIC_APP_URL", "APP_URL"]) ||
    "https://callrecover.net"
  ).replace(/\/$/, "");
}

async function stripeFormRequest(path: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Stripe request failed with ${response.status}`);
  }
  return json;
}

async function createStripeCustomer(business: any, email?: string | null) {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (business.business_name) params.set("name", business.business_name);
  params.set("metadata[business_id]", business.id);
  params.set("metadata[source]", "callrecover");
  return stripeFormRequest("customers", params);
}

function couponIsRedeemable(coupon: CouponRow) {
  if (!coupon.active) return false;
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return false;
  if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) return false;
  return true;
}

function stripeSafeCouponId(code: string) {
  return `cr_${code.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")}`.slice(0, 40);
}

async function ensureStripeCoupon(coupon: CouponRow) {
  if (coupon.stripe_coupon_id) return coupon.stripe_coupon_id;

  const couponId = stripeSafeCouponId(coupon.code);
  const params = new URLSearchParams();
  params.set("id", couponId);
  params.set("name", coupon.name);
  if (coupon.percent_off) {
    params.set("percent_off", String(coupon.percent_off));
  } else if (coupon.amount_off_cents) {
    params.set("amount_off", String(coupon.amount_off_cents));
    params.set("currency", "usd");
  }
  if (coupon.duration_months) {
    params.set("duration", "repeating");
    params.set("duration_in_months", String(coupon.duration_months));
  } else {
    params.set("duration", "once");
  }

  const created = await stripeFormRequest("coupons", params).catch((error) => {
    if (String(error?.message ?? "").toLowerCase().includes("already exists")) return { id: couponId };
    throw error;
  });

  await admin.from("billing_coupons").update({ stripe_coupon_id: created.id }).eq("id", coupon.id);
  return created.id as string;
}

async function loadActivePlan(code: string) {
  const { data, error } = await admin
    .from("subscription_plans")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Plan is not available.");
  return data as PlanRow;
}

async function loadCoupon(code: string) {
  if (!code.trim()) return null;
  const { data, error } = await admin
    .from("billing_coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !couponIsRedeemable(data as CouponRow)) throw new Error("Coupon is not active or has expired.");
  return data as CouponRow;
}

export const listBillingPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [businessResult, plansResult] = await Promise.all([
      getBusinessForUser(context.supabase),
      context.supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (plansResult.error) throw new Error(plansResult.error.message);

    return {
      business: businessResult
        ? {
            id: businessResult.id,
            name: businessResult.business_name,
            subscriptionPlanCode: businessResult.subscription_plan_code,
            subscriptionStatus: businessResult.subscription_status,
            subscriptionCurrentPeriodEnd: businessResult.subscription_current_period_end,
            trialCallSecondsLimit: (businessResult as any).trial_call_seconds_limit ?? 900,
            trialCallSecondsUsed: (businessResult as any).trial_call_seconds_used ?? 0,
            trialCallSecondsRemaining: (businessResult as any).trial_call_seconds_remaining ?? 900,
          }
        : null,
      plans: ((plansResult.data ?? []) as PlanRow[]).map(normalizePlan),
      costBasis: {
        vapiHostingPerMinuteCents: 5,
        twilioInboundVoicePerMinuteCents: 0.85,
        twilioOutboundVoicePerMinuteCents: 1.4,
        twilioSmsPerSegmentCents: 0.83,
        twilioLocalNumberMonthlyCents: 115,
      },
    };
  });

export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      planCode: z.string().min(1),
      couponCode: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const business = await getBusinessForUser(context.supabase);
    if (!business) throw new Error("No business found for this account.");

    const plan = await loadActivePlan(data.planCode);
    const coupon = data.couponCode ? await loadCoupon(data.couponCode) : null;
    const discountCouponId = coupon ? await ensureStripeCoupon(coupon) : null;

    let customerId = business.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await createStripeCustomer(business, context.claims?.email as string | undefined);
      customerId = customer.id;
      await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business.id);
    }

    const base = publicBaseUrl();
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer", customerId!);
    params.set("client_reference_id", business.id);
    params.set("success_url", `${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${base}/billing?checkout=cancelled`);
    params.set("metadata[business_id]", business.id);
    params.set("metadata[plan_code]", plan.code);
    params.set("metadata[user_id]", context.userId);
    params.set("subscription_data[metadata][business_id]", business.id);
    params.set("subscription_data[metadata][plan_code]", plan.code);
    params.set("subscription_data[metadata][source]", "callrecover");
    params.set("line_items[0][quantity]", "1");

    if (plan.stripe_price_id) {
      params.set("line_items[0][price]", plan.stripe_price_id);
    } else {
      params.set("line_items[0][price_data][currency]", "usd");
      params.set("line_items[0][price_data][unit_amount]", String(plan.monthly_price_cents));
      params.set("line_items[0][price_data][recurring][interval]", "month");
      params.set("line_items[0][price_data][product_data][name]", `CallRecover ${plan.name}`);
      params.set("line_items[0][price_data][product_data][description]", plan.description ?? "");
      params.set("line_items[0][price_data][product_data][metadata][plan_code]", plan.code);
    }

    if (discountCouponId) {
      params.set("discounts[0][coupon]", discountCouponId);
    } else {
      params.set("allow_promotion_codes", "true");
    }

    const session = await stripeFormRequest("checkout/sessions", params);
    await admin
      .from("businesses")
      .update({
        subscription_plan_code: plan.code,
        stripe_checkout_session_id: session.id,
      })
      .eq("id", business.id);

    return { url: session.url as string, sessionId: session.id as string };
  });

export const getBillingAdminConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.userId);

    const [{ data: plans, error: planError }, { data: coupons, error: couponError }] = await Promise.all([
      admin.from("subscription_plans").select("*").order("sort_order", { ascending: true }),
      admin.from("billing_coupons").select("*").order("created_at", { ascending: false }),
    ]);
    if (planError) throw new Error(planError.message);
    if (couponError) throw new Error(couponError.message);

    return {
      plans: ((plans ?? []) as PlanRow[]).map(normalizePlan),
      coupons: ((coupons ?? []) as CouponRow[]).map(normalizeCoupon),
    };
  });

export const saveBillingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      monthlyPriceCents: z.number().int().min(0),
      includedCallMinutes: z.number().int().min(0),
      includedSmsSegments: z.number().int().min(0),
      estimatedAiMinutes: z.number().int().min(0),
      estimatedSmsSegments: z.number().int().min(0),
      costPerAiMinuteCents: z.number().min(0),
      costPerSmsSegmentCents: z.number().min(0),
      phoneNumberMonthlyCents: z.number().int().min(0),
      platformBufferCents: z.number().int().min(0),
      overageCallMinuteCents: z.number().int().min(0),
      overageSmsSegmentCents: z.number().int().min(0),
      stripePriceId: z.string().optional().nullable(),
      features: z.array(z.string()).default([]),
      active: z.boolean(),
      sortOrder: z.number().int(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);

    const { error } = await admin.from("subscription_plans").upsert({
      code: data.code.trim().toLowerCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      monthly_price_cents: data.monthlyPriceCents,
      included_call_minutes: data.includedCallMinutes,
      included_sms_segments: data.includedSmsSegments,
      estimated_ai_minutes: data.estimatedAiMinutes,
      estimated_sms_segments: data.estimatedSmsSegments,
      cost_per_ai_minute_cents: data.costPerAiMinuteCents,
      cost_per_sms_segment_cents: data.costPerSmsSegmentCents,
      phone_number_monthly_cents: data.phoneNumberMonthlyCents,
      platform_buffer_cents: data.platformBufferCents,
      overage_call_minute_cents: data.overageCallMinuteCents,
      overage_sms_segment_cents: data.overageSmsSegmentCents,
      stripe_price_id: data.stripePriceId?.trim() || null,
      features: data.features,
      active: data.active,
      sort_order: data.sortOrder,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBillingCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional().nullable(),
      code: z.string().min(1),
      name: z.string().min(1),
      percentOff: z.number().int().min(1).max(100).optional().nullable(),
      amountOffCents: z.number().int().min(1).optional().nullable(),
      durationMonths: z.number().int().min(1).optional().nullable(),
      stripeCouponId: z.string().optional().nullable(),
      active: z.boolean(),
      maxRedemptions: z.number().int().min(1).optional().nullable(),
      expiresAt: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    if (Boolean(data.percentOff) === Boolean(data.amountOffCents)) {
      throw new Error("Set either percent off or amount off, not both.");
    }

    const row = {
      ...(data.id ? { id: data.id } : {}),
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      percent_off: data.percentOff ?? null,
      amount_off_cents: data.amountOffCents ?? null,
      duration_months: data.durationMonths ?? null,
      stripe_coupon_id: data.stripeCouponId?.trim() || null,
      active: data.active,
      max_redemptions: data.maxRedemptions ?? null,
      expires_at: data.expiresAt || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("billing_coupons").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
