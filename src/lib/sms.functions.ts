import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COMPLIANCE_SUFFIX = "\nReply STOP to opt out, HELP for help. Msg & data rates may apply.";

/**
 * Send an SMS via Twilio REST API and persist it to sms_threads / sms_messages.
 * Appends a one-time STOP/HELP disclosure on the first outbound message in a thread.
 */
export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      body: z.string().min(1).max(1500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
    }

    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("id, business_id, caller_number")
      .eq("id", data.callId)
      .single();
    if (callErr || !call) throw new Error(callErr?.message ?? "Call not found");

    // Respect SMS opt-outs (A2P 10DLC). Check the most recent consent record.
    const { data: lastConsent } = await supabase
      .from("sms_consents" as any)
      .select("status")
      .eq("business_id", call.business_id)
      .eq("caller_number", call.caller_number)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((lastConsent as any)?.status === "opted_out") {
      throw new Error("This number has opted out of SMS (replied STOP). They must text START to resubscribe.");
    }

    // Find or create the SMS thread for this caller.
    let threadId: string | null = null;
    let isFirstOutbound = false;
    const { data: existing } = await supabase
      .from("sms_threads")
      .select("id")
      .eq("business_id", call.business_id)
      .eq("caller_number", call.caller_number)
      .maybeSingle();

    if (existing) {
      threadId = existing.id;
      const { count } = await supabase
        .from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", existing.id)
        .eq("direction", "outbound");
      isFirstOutbound = (count ?? 0) === 0;
    } else {
      const { data: created, error: tErr } = await supabase
        .from("sms_threads")
        .insert({
          business_id: call.business_id,
          caller_number: call.caller_number,
        } as any)
        .select("id")
        .single();
      if (tErr || !created) throw new Error(tErr?.message ?? "Could not create thread");
      threadId = created.id;
      isFirstOutbound = true;
    }

    const finalBody = isFirstOutbound ? `${data.body}${COMPLIANCE_SUFFIX}` : data.body;

    // Send via Twilio REST API.
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const form = new URLSearchParams({
      To: call.caller_number,
      From: fromNumber,
      Body: finalBody,
    });

    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (payload as any)?.message ?? `Twilio error ${res.status}`;
      throw new Error(msg);
    }

    const providerSid = (payload as any)?.sid ?? null;

    const { error: msgErr } = await supabase.from("sms_messages").insert({
      thread_id: threadId,
      direction: "outbound",
      body: finalBody,
    } as any);
    if (msgErr) throw new Error(msgErr.message);

    await supabase
      .from("sms_threads")
      .update({ last_message_at: new Date().toISOString() } as any)
      .eq("id", threadId);

    // Bump lead to contacted on first reply.
    await supabase
      .from("calls")
      .update({ lead_status: "contacted" })
      .eq("id", call.id)
      .eq("lead_status", "open");

    return { ok: true, sid: providerSid };
  });