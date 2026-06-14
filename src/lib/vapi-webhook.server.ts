import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scanForEmergency } from "@/lib/emergency-keywords";
import {
  sendBusinessLeadAlertSms,
  sendDoubleOptInForCall,
} from "@/lib/sms-send.server";
import { sendMobilePushForNotification } from "@/lib/mobile-push.server";
import { reclaimVapiNumberForBusiness } from "@/lib/vapi.functions";

type Priority = "normal" | "high";
type Urgency = "low" | "medium" | "high" | "emergency";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function firstText(...values: unknown[]) {
  return values.map(text).find(Boolean) ?? "";
}

function firstPhone(...values: unknown[]) {
  return values.map(normalizePhone).find(Boolean) ?? "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function getMessage(payload: any) {
  return payload?.message ?? payload ?? {};
}

function getCall(message: any, payload: any) {
  return message?.call ?? payload?.call ?? {};
}

function getArtifact(message: any, call: any, payload: any) {
  return message?.artifact ?? call?.artifact ?? payload?.artifact ?? {};
}

function getRecordingUrl(artifact: any, call: any, message: any) {
  return firstText(
    artifact?.recordingUrl,
    artifact?.recording?.url,
    artifact?.recording?.mono?.combinedUrl,
    artifact?.recording?.stereoUrl,
    call?.recordingUrl,
    message?.recordingUrl,
  );
}

function getDurationSeconds(message: any, call: any) {
  const explicitSeconds = firstNumber(
    message?.durationSeconds,
    message?.duration_seconds,
    call?.durationSeconds,
    call?.duration_seconds,
    call?.duration,
  );
  if (explicitSeconds !== null) {
    return Math.max(0, Math.round(explicitSeconds));
  }

  const explicitMs = firstNumber(message?.durationMs, message?.duration_ms, call?.durationMs, call?.duration_ms);
  if (explicitMs !== null) {
    return Math.max(0, Math.round(explicitMs / 1000));
  }

  const startedAt = firstText(message?.startedAt, call?.startedAt, call?.started_at);
  const endedAt = firstText(message?.endedAt, call?.endedAt, call?.ended_at);
  if (startedAt && endedAt) {
    const started = new Date(startedAt).getTime();
    const ended = new Date(endedAt).getTime();
    if (Number.isFinite(started) && Number.isFinite(ended) && ended > started) {
      return Math.round((ended - started) / 1000);
    }
  }

  return 0;
}

function getStructuredData(message: any, call: any) {
  return (
    message?.analysis?.structuredData ??
    message?.analysis?.structured_data ??
    call?.analysis?.structuredData ??
    call?.analysis?.structured_data ??
    message?.structuredData ??
    call?.structuredData ??
    {}
  );
}

function boolish(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["yes", "true", "y", "1", "agreed", "consented", "opted in", "opt-in"].includes(v)) return true;
    if (["no", "false", "n", "0", "declined", "refused", "opted out", "opt-out"].includes(v)) return false;
  }
  return undefined;
}

function findBooleanKey(value: any, keys: string[]): boolean | undefined {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (keys.includes(key.toLowerCase())) {
      const parsed = boolish(child);
      if (parsed !== undefined) return parsed;
    }
    if (child && typeof child === "object") {
      const parsed = findBooleanKey(child, keys);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

function messageText(item: any) {
  return firstText(item?.message, item?.content, item?.text, item?.transcript);
}

function detectSmsConsent(structured: any, artifact: any, transcript: string) {
  const structuredConsent = findBooleanKey(structured, [
    "smsconsent",
    "sms_consent",
    "textconsent",
    "text_consent",
    "wantssms",
    "wants_sms",
    "smsoptin",
    "sms_opt_in",
    "textoptin",
    "text_opt_in",
  ]);
  if (structuredConsent !== undefined) return structuredConsent;

  const messages = Array.isArray(artifact?.messages) ? artifact.messages : [];
  for (let i = 0; i < messages.length - 1; i += 1) {
    const assistant = messages[i];
    const user = messages[i + 1];
    const assistantText = messageText(assistant).toLowerCase();
    const userText = messageText(user).toLowerCase();
    const askedForSms =
      /text|sms/.test(assistantText) &&
      /confirm|confirmation|update|notification|optional|call you back either way/.test(assistantText);
    const positive = /\b(yes|yeah|yep|sure|ok|okay|please|that works|sounds good)\b/.test(userText);
    const negative = /\b(no|nope|do not|don't|stop|not now)\b/.test(userText);
    if (askedForSms && positive && !negative) return true;
    if (askedForSms && negative) return false;
  }

  const smsPromptIndex = transcript.toLowerCase().search(/text|sms/);
  if (smsPromptIndex >= 0) {
    const nearby = transcript.slice(smsPromptIndex, smsPromptIndex + 500).toLowerCase();
    if (/\b(user|caller|customer)\s*:\s*(yes|yeah|yep|sure|ok|okay|please)\b/.test(nearby)) return true;
    if (/\b(user|caller|customer)\s*:\s*(no|nope|do not|don't)\b/.test(nearby)) return false;
  }

  return false;
}

function detectCallbackRequested(structured: any, transcript: string) {
  const structuredCallback = findBooleanKey(structured, ["callbackrequested", "callback_requested", "wantscallback", "wants_callback"]);
  if (structuredCallback !== undefined) return structuredCallback;
  if (/call\s*back|callback|reach me|return my call|give me a call/i.test(transcript)) return true;
  return true;
}

function detectUrgency(structured: any, transcript: string, summary: string) {
  const emergency = scanForEmergency(`${transcript}\n${summary}`);
  const raw = firstText(
    structured?.urgency,
    structured?.priority,
    structured?.call_priority,
    structured?.callPriority,
  ).toLowerCase();

  let urgency: Urgency = "medium";
  if (emergency.isEmergency || ["emergency", "urgent", "asap"].includes(raw)) urgency = "emergency";
  else if (["high", "same day", "today"].includes(raw)) urgency = "high";
  else if (["low", "routine"].includes(raw)) urgency = "low";

  const priority: Priority = urgency === "emergency" || urgency === "high" ? "high" : "normal";
  return { urgency, priority, emergencyMatches: emergency.matches };
}

async function resolveBusiness(message: any, call: any) {
  const phoneNumberId = firstText(
    call?.phoneNumberId,
    call?.phoneNumber?.id,
    message?.phoneNumberId,
    message?.phoneNumber?.id,
  );
  const assistantId = firstText(
    call?.assistantId,
    call?.assistant?.id,
    message?.assistantId,
    message?.assistant?.id,
  );
  const toNumber = firstPhone(
    call?.phoneNumber?.number,
    call?.phoneNumber?.twilioPhoneNumber,
    call?.phoneNumber,
    call?.to?.number,
    call?.toNumber,
    message?.to,
    message?.toNumber,
  );

  if (assistantId) {
    const { data } = await supabaseAdmin
      .from("vapi_number_assistants")
      .select("business_id")
      .eq("assistant_id", assistantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((data as any)?.business_id) return { businessId: (data as any).business_id as string, toNumber };
  }

  if (phoneNumberId) {
    const { data } = await supabaseAdmin
      .from("vapi_number_assistants")
      .select("business_id")
      .eq("phone_number_id", phoneNumberId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((data as any)?.business_id) return { businessId: (data as any).business_id as string, toNumber };
  }

  if (toNumber) {
    const { data: byVapiNumber } = await supabaseAdmin
      .from("vapi_number_assistants")
      .select("business_id")
      .eq("phone_number", toNumber)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((byVapiNumber as any)?.business_id) return { businessId: (byVapiNumber as any).business_id as string, toNumber };

    const { data: byTwilioNumber } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("twilio_number", toNumber)
      .maybeSingle();
    if ((byTwilioNumber as any)?.id) return { businessId: (byTwilioNumber as any).id as string, toNumber };
  }

  return { businessId: "", toNumber };
}

async function upsertCallRecord(data: {
  businessId: string;
  callerNumber: string;
  callerName?: string | null;
  toNumber?: string | null;
  vapiCallId?: string | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  summaryShort?: string | null;
  serviceNeeded?: string | null;
  urgency: Urgency;
  priority: Priority;
  callbackRequested: boolean;
  qualification: Record<string, unknown>;
  durationSeconds?: number;
}) {
  const payload = {
    business_id: data.businessId,
    caller_number: data.callerNumber,
    caller_name: data.callerName ?? null,
    to_number: data.toNumber ?? null,
    vapi_call_id: data.vapiCallId ?? null,
    recording_url: data.recordingUrl ?? null,
    transcript: data.transcript ?? null,
    ai_summary: data.summary ?? null,
    ai_summary_short: data.summaryShort ?? null,
    service_needed: data.serviceNeeded ?? null,
    urgency: data.urgency,
    priority: data.priority,
    callback_requested: data.callbackRequested,
    qualification: data.qualification,
    duration_seconds: Math.max(0, Math.round(data.durationSeconds ?? 0)),
  };

  if (data.vapiCallId) {
    const { data: existing } = await supabaseAdmin
      .from("calls")
      .select("id")
      .eq("vapi_call_id", data.vapiCallId)
      .maybeSingle();

    if ((existing as any)?.id) {
      const { data: updated, error } = await supabaseAdmin
        .from("calls")
        .update(payload as any)
        .eq("id", (existing as any).id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return updated.id as string;
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("calls")
    .insert({ ...payload, status: "new", lead_status: "open" } as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return inserted.id as string;
}

async function updateTrialStatusIfNeeded(businessId: string) {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, subscription_status, trial_call_seconds_limit")
    .eq("id", businessId)
    .maybeSingle();

  if ((business as any)?.subscription_status !== "trialing") return;

  const { data: usedSeconds, error } = await supabaseAdmin.rpc("business_trial_call_seconds", {
    _business_id: businessId,
  });
  if (error) throw new Error(error.message);

  const limit = Number((business as any)?.trial_call_seconds_limit ?? 900);
  if (Number(usedSeconds ?? 0) >= limit) {
    await supabaseAdmin
      .from("businesses")
      .update({ subscription_status: "trial_exhausted" })
      .eq("id", businessId)
      .eq("subscription_status", "trialing");
    await reclaimVapiNumberForBusiness({
      businessId,
      reason: "trial_exhausted_no_subscription",
      force: true,
    });
  }
}

async function notifyBusiness(callId: string, businessId: string, callerNumber: string, priority: Priority, summary: string) {
  const title = priority === "high" ? "High-priority missed call" : "New missed-call lead";
  const body = `${callerNumber} - ${summary || "AI captured a message."}`;

  await supabaseAdmin.from("notifications").insert({
    business_id: businessId,
    call_id: callId,
    kind: priority === "high" ? "emergency" : "dashboard",
    title,
    body,
  } as any);

  await sendMobilePushForNotification(supabaseAdmin, {
    businessId,
    callId,
    title,
    body,
    data: { kind: priority === "high" ? "emergency" : "dashboard" },
  });

  await sendBusinessLeadAlertSms(supabaseAdmin, {
    businessId,
    callId,
    callerNumber,
    priority,
    summary,
  });
}

export async function handleVapiWebhookPayload(payload: any) {
  const message = getMessage(payload);
  const type = text(message?.type || payload?.type);

  if (type && type !== "end-of-call-report") {
    return { ok: true, ignored: type };
  }

  const call = getCall(message, payload);
  const artifact = getArtifact(message, call, payload);
  const vapiCallId = firstText(call?.id, message?.callId, payload?.callId);
  const callerNumber = firstPhone(
    call?.customer?.number,
    call?.customer?.phoneNumber,
    message?.customer?.number,
    payload?.customer?.number,
    call?.from?.number,
    call?.fromNumber,
    message?.from,
  );
  if (!callerNumber) throw new Error("Vapi webhook missing caller phone number");

  const { businessId, toNumber } = await resolveBusiness(message, call);
  if (!businessId) throw new Error("Vapi webhook could not resolve business");

  const structured = getStructuredData(message, call);
  const durationSeconds = getDurationSeconds(message, call);
  const transcript = firstText(artifact?.transcript, message?.transcript, call?.transcript);
  const summary = firstText(message?.summary, message?.analysis?.summary, call?.analysis?.summary, call?.summary);
  const summaryShort = firstText(
    structured?.summary_short,
    structured?.summaryShort,
    summary,
    transcript,
  ).slice(0, 240);
  const serviceNeeded = firstText(
    structured?.service_needed,
    structured?.serviceNeeded,
    structured?.service,
  ).slice(0, 160);
  const { urgency, priority, emergencyMatches } = detectUrgency(structured, transcript, summary);
  const smsVerbalConsent = detectSmsConsent(structured, artifact, transcript);
  const callId = await upsertCallRecord({
    businessId,
    callerNumber,
    callerName: firstText(call?.customer?.name, structured?.caller_name, structured?.callerName) || null,
    toNumber,
    vapiCallId,
    recordingUrl: getRecordingUrl(artifact, call, message) || null,
    transcript,
    summary,
    summaryShort,
    serviceNeeded,
    urgency,
    priority,
    callbackRequested: detectCallbackRequested(structured, transcript),
    durationSeconds,
    qualification: {
      ...structured,
      vapi_call_id: vapiCallId || null,
      sms_verbal_consent: smsVerbalConsent,
      emergency_matches: emergencyMatches,
      ended_reason: firstText(message?.endedReason, call?.endedReason) || null,
    },
  });

  await updateTrialStatusIfNeeded(businessId);
  await notifyBusiness(callId, businessId, callerNumber, priority, summaryShort);

  let smsConfirmation: unknown = { skipped: "no_verbal_sms_consent" };
  if (smsVerbalConsent) {
    smsConfirmation = await sendDoubleOptInForCall(supabaseAdmin, {
      callId,
      providerRef: vapiCallId || null,
    });
  }

  return { ok: true, callId, priority, smsConfirmation };
}
