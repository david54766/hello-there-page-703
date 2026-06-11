import { AI_VERBAL_SMS_OPT_IN_PROMPT, DOUBLE_OPT_IN_CONFIRMATION_SMS } from "@/lib/sms-consent-copy";

const COMPLIANCE_SUFFIX = "\nReply STOP to opt out, HELP for help. Msg & data rates may apply.";

type TwilioSendResult = {
  sid: string | null;
  body: string;
};

type CallRow = {
  id: string;
  business_id: string;
  caller_number: string;
  priority?: "normal" | "high" | null;
  ai_summary_short?: string | null;
};

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
  }
  return { accountSid, authToken, fromNumber };
}

function withCompliance(body: string) {
  return /reply\s+stop/i.test(body) ? body : `${body}${COMPLIANCE_SUFFIX}`;
}

function normalizeSmsNumber(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function uniqueNumbers(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeSmsNumber).filter(Boolean)));
}

async function sendTwilioSms(to: string, body: string): Promise<TwilioSendResult> {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
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

  return { sid: (payload as any)?.sid ?? null, body };
}

async function getOrCreateThread(supabase: any, businessId: string, callerNumber: string) {
  const { data: existing } = await supabase
    .from("sms_threads")
    .select("id")
    .eq("business_id", businessId)
    .eq("caller_number", callerNumber)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("sms_threads")
    .insert({
      business_id: businessId,
      caller_number: callerNumber,
    } as any)
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create SMS thread");
  return created.id as string;
}

async function recordOutboundMessage(supabase: any, threadId: string, body: string) {
  const { error } = await supabase.from("sms_messages").insert({
    thread_id: threadId,
    direction: "outbound",
    body,
  } as any);
  if (error) throw new Error(error.message);

  await supabase
    .from("sms_threads")
    .update({ last_message_at: new Date().toISOString() } as any)
    .eq("id", threadId);
}

async function getLatestConsent(supabase: any, businessId: string, callerNumber: string) {
  const { data } = await supabase
    .from("sms_consents" as any)
    .select("status")
    .eq("business_id", businessId)
    .eq("caller_number", callerNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.status as "pending" | "opted_in" | "opted_out" | undefined;
}

export async function sendSmsForCall(
  supabase: any,
  data: { callId: string; body: string },
) {
  const { data: call, error: callErr } = await supabase
    .from("calls")
    .select("id, business_id, caller_number")
    .eq("id", data.callId)
    .single();
  if (callErr || !call) throw new Error(callErr?.message ?? "Call not found");

  const callerNumber = normalizeSmsNumber(call.caller_number);
  const consentStatus = await getLatestConsent(supabase, call.business_id, callerNumber);
  if (consentStatus === "opted_out") {
    throw new Error("This number has opted out of SMS. They must text START to resubscribe.");
  }
  if (consentStatus !== "opted_in") {
    throw new Error("SMS double opt-in is not complete yet. The caller must reply YES before customer texts can be sent.");
  }

  const threadId = await getOrCreateThread(supabase, call.business_id, callerNumber);
  const finalBody = withCompliance(data.body);
  const result = await sendTwilioSms(callerNumber, finalBody);

  await recordOutboundMessage(supabase, threadId, finalBody);

  await supabase
    .from("calls")
    .update({ lead_status: "contacted" })
    .eq("id", call.id)
    .eq("lead_status", "open");

  return { ok: true, sid: result.sid, body: finalBody };
}

export async function sendDoubleOptInForCall(
  supabase: any,
  data: { callId: string; providerRef?: string | null },
) {
  const { data: call, error: callErr } = await supabase
    .from("calls")
    .select("id, business_id, caller_number, priority, ai_summary_short")
    .eq("id", data.callId)
    .single();
  if (callErr || !call) throw new Error(callErr?.message ?? "Call not found");

  const callerNumber = normalizeSmsNumber((call as CallRow).caller_number);
  const consentStatus = await getLatestConsent(supabase, (call as CallRow).business_id, callerNumber);
  if (consentStatus === "opted_out") {
    return { ok: false, skipped: "opted_out" };
  }
  if (consentStatus === "opted_in") {
    return { ok: true, skipped: "already_opted_in" };
  }

  const body = DOUBLE_OPT_IN_CONFIRMATION_SMS;

  const threadId = await getOrCreateThread(supabase, (call as CallRow).business_id, callerNumber);
  const result = await sendTwilioSms(callerNumber, body);
  await recordOutboundMessage(supabase, threadId, body);

  await supabase.from("sms_consents").insert({
    business_id: (call as CallRow).business_id,
    caller_number: callerNumber,
    status: "pending",
    keyword: "VERBAL_YES",
    source: "vapi_voice",
    consent_text: AI_VERBAL_SMS_OPT_IN_PROMPT,
    call_id: (call as CallRow).id,
    provider_ref: data.providerRef ?? null,
  } as any);

  return { ok: true, sid: result.sid, body };
}

export async function sendBusinessLeadAlertSms(
  supabase: any,
  data: { businessId: string; callId: string; callerNumber: string; priority: "normal" | "high"; summary?: string | null },
) {
  const { data: business } = await supabase
    .from("businesses")
    .select("business_name, notify_sms, owner_phone, business_phone")
    .eq("id", data.businessId)
    .maybeSingle();

  if (!(business as any)?.notify_sms) return { ok: true, skipped: "disabled", sent: 0 };

  const { data: members } = await supabase
    .from("team_members")
    .select("phone")
    .eq("business_id", data.businessId)
    .eq("active", true)
    .not("phone", "is", null)
    .limit(5);

  const recipients = uniqueNumbers([
    ...((members ?? []) as Array<{ phone?: string | null }>).map((member) => member.phone),
    (business as any)?.owner_phone,
    (business as any)?.business_phone,
  ]);

  if (!recipients.length) return { ok: true, skipped: "no_recipients", sent: 0 };

  const priorityText = data.priority === "high" ? "HIGH PRIORITY - call back ASAP" : "New missed-call lead";
  const summary = (data.summary || "Open CallRecover for the transcript and recording.").replace(/\s+/g, " ").slice(0, 180);
  const body = withCompliance(`CallRecover: ${priorityText} from ${data.callerNumber}. ${summary}`);

  let sent = 0;
  const failures: string[] = [];
  for (const recipient of recipients) {
    try {
      await sendTwilioSms(recipient, body);
      sent += 1;
    } catch (error) {
      failures.push(`${recipient}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return { ok: failures.length === 0, sent, failures };
}
