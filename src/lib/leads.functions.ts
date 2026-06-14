import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJSON } from "./ai.server";
import { scanForEmergency } from "./emergency-keywords";
import { sendMobilePushForNotification } from "./mobile-push.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsForCall } from "@/lib/sms-send.server";

type Qualification = {
  service_needed?: string;
  urgency?: "low" | "medium" | "high" | "emergency";
  callback_time?: string;
  address?: string;
  insurance_claim?: string;
  summary_short?: string;
};

const LEAD_STATUSES = [
  "open",
  "contacted",
  "scheduled",
  "active",
  "requesting_call",
  "in_progress",
  "closed",
] as const;

const TEXTABLE_STATUSES = ["scheduled", "requesting_call", "in_progress"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];
type TextableLeadStatus = (typeof TEXTABLE_STATUSES)[number];

function titleCaseStatus(status: LeadStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanText(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizePhone(value?: string | null) {
  const raw = cleanText(value);
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function buildStatusText(input: {
  status: TextableLeadStatus;
  businessName?: string | null;
  businessNumber?: string | null;
  agentName?: string | null;
  agentNumber?: string | null;
  callbackTime?: string | null;
}) {
  const businessName = cleanText(input.businessName) || "the business";
  const businessNumber = normalizePhone(input.businessNumber);
  const agentName = cleanText(input.agentName);
  const agentNumber = normalizePhone(input.agentNumber);
  const callbackTime = cleanText(input.callbackTime);
  const agentLine = agentName && agentNumber
    ? `${agentName} can be reached at ${agentNumber}`
    : agentName
      ? `${agentName} is assigned`
      : agentNumber
        ? `Your assigned contact is ${agentNumber}`
        : businessNumber
          ? `Call ${businessNumber} if you need to reach us`
          : "The team has your details";

  if (input.status === "scheduled") {
    return `CallRecover: ${businessName} has your request scheduled${callbackTime ? ` for ${callbackTime}` : ""}. ${agentLine}.`;
  }

  if (input.status === "requesting_call") {
    return `CallRecover: ${businessName} received your request and is asking the right person to call you back. ${agentLine}.`;
  }

  return `CallRecover: ${businessName} is actively working on your request. ${agentLine}.`;
}

async function buildContext(supabase: any, callId: string) {
  const { data: call } = await supabase.from("calls").select("*").eq("id", callId).single();
  if (!call) throw new Error("Call not found");
  const { data: thread } = await supabase
    .from("sms_threads")
    .select("id")
    .eq("business_id", call.business_id)
    .eq("caller_number", call.caller_number)
    .maybeSingle();
  let messages: { direction: string; body: string }[] = [];
  if (thread) {
    const { data } = await supabase
      .from("sms_messages")
      .select("direction, body, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    messages = data ?? [];
  }
  return { call, thread, messages };
}

export const qualifyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { call, messages } = await buildContext(supabase, data.callId);

    const transcript = call.transcript ?? "";
    const convo = messages.map((m) => `${m.direction === "inbound" ? "Customer" : "Business"}: ${m.body}`).join("\n");
    const corpus = `VOICEMAIL TRANSCRIPT:\n${transcript}\n\nSMS THREAD:\n${convo || "(none)"}`;

    const emergency = scanForEmergency(`${transcript}\n${convo}`);

    const result = await aiJSON<Qualification>({
      system: "You are an assistant for a home services contractor. Extract structured info from a customer voicemail and SMS thread. Reply with strict JSON only.",
      prompt: `Extract these fields as JSON: service_needed (short phrase), urgency (one of: low, medium, high, emergency), callback_time (free-text or empty), address (or empty), insurance_claim (yes/no/empty), summary_short (one contractor-friendly sentence, e.g. "Customer has active roof leak after storm damage. Wants callback ASAP.").\n\n${corpus}`,
    });

    const urgency = emergency.isEmergency ? "emergency" : (result.urgency ?? call.urgency);
    const priority = emergency.isEmergency || urgency === "emergency" || urgency === "high" ? "high" : "normal";

    const { error } = await supabase
      .from("calls")
      .update({
        qualification: result,
        ai_summary_short: result.summary_short ?? null,
        urgency,
        priority,
      })
      .eq("id", call.id);
    if (error) throw new Error(error.message);

    if (priority === "high") {
      const notification = {
        business_id: call.business_id,
        call_id: call.id,
        kind: "dashboard",
        title: "🚨 High-priority lead",
        body: result.summary_short ?? `Emergency keywords detected from ${call.caller_number}`,
      };

      await supabase.from("notifications").insert(notification as any);
      await sendMobilePushForNotification(supabase, {
        businessId: call.business_id,
        callId: call.id,
        title: notification.title,
        body: notification.body,
        data: { kind: notification.kind },
      });
    }

    return { qualification: result, urgency, priority, emergencyMatches: emergency.matches };
  });

export const suggestReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { call, messages } = await buildContext(supabase, data.callId);
    const convo = messages.map((m) => `${m.direction === "inbound" ? "Customer" : "Business"}: ${m.body}`).join("\n");

    const result = await aiJSON<{ replies: string[] }>({
      system: "You help a busy contractor reply to customer texts. Write short, warm, professional SMS replies under 160 chars each. Reply with strict JSON.",
      prompt: `Suggest 3 quick reply options for this conversation. Return JSON: { "replies": ["...", "...", "..."] }.\n\nCustomer voicemail: ${call.transcript ?? "(none)"}\n\nThread:\n${convo || "(no messages yet)"}`,
    });

    return { replies: (result.replies ?? []).slice(0, 3) };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      status: z.enum(LEAD_STATUSES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calls")
      .update({ lead_status: data.status })
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLeadDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      callbackTime: z.string().max(200).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      insurance: z.string().max(200).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: call, error: readError } = await context.supabase
      .from("calls")
      .select("qualification")
      .eq("id", data.callId)
      .single();
    if (readError || !call) throw new Error(readError?.message ?? "Call not found");

    const current = ((call as any).qualification ?? {}) as Record<string, unknown>;
    const next = {
      ...current,
      callback_time: cleanText(data.callbackTime),
      address: cleanText(data.address),
      insurance_claim: cleanText(data.insurance),
    };

    const { error } = await context.supabase
      .from("calls")
      .update({ qualification: next } as any)
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    return { ok: true, qualification: next };
  });

export const sendLeadStatusText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      status: z.enum(TEXTABLE_STATUSES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: call, error: callError } = await context.supabase
      .from("calls")
      .select("id, business_id, qualification")
      .eq("id", data.callId)
      .single();
    if (callError || !call) throw new Error(callError?.message ?? "Call not found");

    const [{ data: business }, { data: assignment }] = await Promise.all([
      context.supabase
        .from("businesses")
        .select("business_name, business_phone, owner_phone")
        .eq("id", (call as any).business_id)
        .maybeSingle(),
      context.supabase
        .from("lead_assignments")
        .select("team_members(name, phone)")
        .eq("call_id", data.callId)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const member = (assignment as any)?.team_members;
    const qualification = ((call as any).qualification ?? {}) as Record<string, unknown>;
    const body = buildStatusText({
      status: data.status,
      businessName: (business as any)?.business_name,
      businessNumber: (business as any)?.business_phone ?? (business as any)?.owner_phone,
      agentName: member?.name,
      agentNumber: member?.phone,
      callbackTime: typeof qualification.callback_time === "string" ? qualification.callback_time : null,
    });

    const sent = await sendSmsForCall(supabaseAdmin, { callId: data.callId, body });
    const { error } = await context.supabase
      .from("calls")
      .update({ lead_status: data.status } as any)
      .eq("id", data.callId);
    if (error) throw new Error(error.message);

    return { ok: true, status: data.status, label: titleCaseStatus(data.status), sid: sent.sid };
  });

export const archiveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calls")
      .update({
        lead_status: "closed",
        status: "resolved",
        archived_at: new Date().toISOString(),
        archived_by: context.userId,
      } as any)
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("calls")
      .update({ archived_at: null, archived_by: null } as any)
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const scheduleCallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      type: z.enum(["immediate", "scheduled"]),
      scheduledFor: z.string().datetime().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: call } = await supabase.from("calls").select("business_id, caller_number").eq("id", data.callId).single();
    if (!call) throw new Error("Call not found");
    const { error } = await supabase.from("callbacks").insert({
      business_id: call.business_id,
      call_id: data.callId,
      caller_number: call.caller_number,
      type: data.type,
      scheduled_for: data.scheduledFor ?? null,
    } as any);
    if (error) throw new Error(error.message);
    await supabase.from("calls").update({ lead_status: "scheduled", callback_requested: true }).eq("id", data.callId);
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications").update({ read: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
