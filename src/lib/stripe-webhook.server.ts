import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getFirstServerEnv } from "@/lib/env.server";

const admin = supabaseAdmin as any;

function webhookSecret() {
  return getFirstServerEnv(["STRIPE_WEBHOOK_SECRET", "CALLRECOVER_STRIPE_WEBHOOK_SECRET"]);
}

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = webhookSecret();
  if (!secret) return false;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value];
    }),
  );

  const timestamp = parts.t;
  const signatures = signatureHeader
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || !signatures.length) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

  return signatures.some((signature) => {
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

function periodEndFromSubscription(subscription: any) {
  const value = subscription?.current_period_end;
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function updateBusinessSubscription(input: {
  businessId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  sessionId?: string | null;
  planCode?: string | null;
  status?: string | null;
  periodEnd?: string | null;
}) {
  const updates: Record<string, unknown> = {};
  if (input.customerId) updates.stripe_customer_id = input.customerId;
  if (input.subscriptionId) updates.stripe_subscription_id = input.subscriptionId;
  if (input.sessionId) updates.stripe_checkout_session_id = input.sessionId;
  if (input.planCode) updates.subscription_plan_code = input.planCode;
  if (input.status) updates.subscription_status = input.status;
  if (input.periodEnd !== undefined) updates.subscription_current_period_end = input.periodEnd;

  if (!Object.keys(updates).length) return;

  let query = admin.from("businesses").update(updates);
  if (input.businessId) {
    query = query.eq("id", input.businessId);
  } else if (input.subscriptionId) {
    query = query.eq("stripe_subscription_id", input.subscriptionId);
  } else if (input.customerId) {
    query = query.eq("stripe_customer_id", input.customerId);
  } else {
    return;
  }
  await query;
}

async function incrementCouponRedemption(couponId?: string | null) {
  if (!couponId) return;
  const { data } = await admin
    .from("billing_coupons")
    .select("id, redemption_count")
    .eq("stripe_coupon_id", couponId)
    .maybeSingle();
  if (!data?.id) return;
  await admin
    .from("billing_coupons")
    .update({ redemption_count: (data.redemption_count ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", data.id);
}

export async function handleStripeWebhook(request: Request) {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return Response.json({ ok: false, error: "Invalid Stripe signature" }, { status: 401 });
  }

  const event = JSON.parse(payload);
  const object = event?.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    await updateBusinessSubscription({
      businessId: object.metadata?.business_id ?? object.client_reference_id,
      customerId: typeof object.customer === "string" ? object.customer : object.customer?.id,
      subscriptionId: typeof object.subscription === "string" ? object.subscription : object.subscription?.id,
      sessionId: object.id,
      planCode: object.metadata?.plan_code,
      status: "checkout_completed",
      periodEnd: null,
    });
    const couponId = object.total_details?.breakdown?.discounts?.[0]?.discount?.coupon?.id;
    await incrementCouponRedemption(couponId);
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await updateBusinessSubscription({
      businessId: object.metadata?.business_id,
      customerId: typeof object.customer === "string" ? object.customer : object.customer?.id,
      subscriptionId: object.id,
      planCode: object.metadata?.plan_code,
      status: object.status,
      periodEnd: periodEndFromSubscription(object),
    });
  }

  if (event.type === "customer.subscription.deleted") {
    await updateBusinessSubscription({
      businessId: object.metadata?.business_id,
      customerId: typeof object.customer === "string" ? object.customer : object.customer?.id,
      subscriptionId: object.id,
      status: "canceled",
      periodEnd: periodEndFromSubscription(object),
    });
  }

  if (event.type === "invoice.payment_failed") {
    const subscriptionId =
      typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
    await updateBusinessSubscription({
      customerId: typeof object.customer === "string" ? object.customer : object.customer?.id,
      subscriptionId,
      status: "past_due",
    });
  }

  if (event.type === "invoice.paid") {
    const subscriptionId =
      typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
    await updateBusinessSubscription({
      customerId: typeof object.customer === "string" ? object.customer : object.customer?.id,
      subscriptionId,
      status: "active",
    });
  }

  return Response.json({ ok: true });
}
