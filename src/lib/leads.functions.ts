import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJSON } from "./ai.server";
import { scanForEmergency } from "./emergency-keywords";
import { sendMobilePushForNotification } from "./mobile-push.server";

type Qualification = {
  service_needed?: string;
  urgency?: "low" | "medium" | "high" | "emergency";
  callback_time?: string;
  address?: string;
  insurance_claim?: string;
  summary_short?: string;
};

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
      status: z.enum(["open", "contacted", "scheduled", "closed"]),
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
