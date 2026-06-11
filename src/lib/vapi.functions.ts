import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyTags, mergeTagDefaults, type TagValues } from "@/lib/tags";
import { DEFAULT_VOICE_ID } from "@/lib/voices";

const BASE = "https://api.vapi.ai";
const VAPI_SERVER_MESSAGES = ["end-of-call-report"];

async function vapi(path: string, init: RequestInit = {}) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function publicBaseUrl() {
  return (
    process.env.CALLRECOVER_PUBLIC_URL ||
    process.env.PUBLIC_APP_URL ||
    "https://callrecover.net"
  ).replace(/\/+$/, "");
}

function vapiServerConfig() {
  const credentialId = process.env.VAPI_WEBHOOK_CREDENTIAL_ID?.trim();
  return {
    url: `${publicBaseUrl()}/api/public/vapi/webhook`,
    timeoutSeconds: 20,
    ...(credentialId ? { credentialId } : {}),
  };
}

async function loadBusinessForUser(supabase: any) {
  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id")
    .limit(1);
  const businessId = memberships?.[0]?.business_id as string | undefined;
  if (!businessId) return { business: null, businessId: null };
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  return { business, businessId };
}

export const listVapiAssistants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const data = await vapi("/assistant");
    return { assistants: (data as any[]).map((a) => ({ id: a.id, name: a.name ?? "(unnamed)" })) };
  });

export const listVapiPhoneNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const data = await vapi("/phone-number");
    return { numbers: (data as any[]).map((n) => ({ id: n.id, number: n.number ?? n.twilioPhoneNumber ?? "(no number)", name: n.name ?? "" })) };
  });

export const createVapiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      assistantId: z.string().min(1),
      phoneNumberId: z.string().min(1),
      customerNumber: z.string().min(5).max(20).regex(/^\+[1-9]\d{4,14}$/, "Use E.164 format e.g. +15551234567"),
      systemPrompt: z.string().max(8000).optional(),
      firstMessage: z.string().max(2000).optional(),
      tagOverrides: z.record(z.string(), z.string().max(500)).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { business } = await loadBusinessForUser(context.supabase);
    const tags: TagValues = mergeTagDefaults(business, (data.tagOverrides ?? {}) as TagValues);
    const assistantOverrides: Record<string, unknown> = {};
    const resolvedPrompt = data.systemPrompt && data.systemPrompt.trim()
      ? applyTags(data.systemPrompt, tags)
      : "";
    const resolvedFirst = data.firstMessage && data.firstMessage.trim()
      ? applyTags(data.firstMessage, tags)
      : "";
    if (resolvedPrompt) {
      assistantOverrides.model = {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: resolvedPrompt }],
      };
    }
    if (resolvedFirst) {
      assistantOverrides.firstMessage = resolvedFirst;
    }
    const call = await vapi("/call", {
      method: "POST",
      body: JSON.stringify({
        assistantId: data.assistantId,
        phoneNumberId: data.phoneNumberId,
        customer: { number: data.customerNumber, ...(tags.name ? { name: tags.name } : {}) },
        ...(Object.keys(assistantOverrides).length ? { assistantOverrides } : {}),
      }),
    });
    return { call, resolvedPrompt, resolvedFirstMessage: resolvedFirst };
  });

export const listVapiCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const data = await vapi("/call?limit=25");
    const calls = (data as any[]).map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      status: c.status,
      endedReason: c.endedReason ?? null,
      customerNumber: c.customer?.number ?? null,
      durationSeconds: c.startedAt && c.endedAt ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000) : null,
      transcript: c.transcript ?? null,
    }));
    return { calls };
  });

export const getVapiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const c = await vapi(`/call/${data.id}`);
    return {
      call: {
        id: c.id,
        status: c.status,
        endedReason: c.endedReason ?? null,
        transcript: c.transcript ?? null,
        messages: c.messages ?? c.artifact?.messages ?? [],
        recordingUrl: c.recordingUrl ?? c.artifact?.recordingUrl ?? null,
      },
    };
  });

// -------- Per-number assistant management --------

function defaultAssistantPayload(
  name: string,
  firstMessage: string,
  systemPrompt: string,
  voiceId: string,
) {
  return {
    name,
    firstMessage,
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
    },
    voice: { provider: "11labs", voiceId },
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    server: vapiServerConfig(),
    serverMessages: VAPI_SERVER_MESSAGES,
    // Let the assistant finish its sentence; don't yield on filler words.
    startSpeakingPlan: { waitSeconds: 0.6, smartEndpointingEnabled: true },
    stopSpeakingPlan: { numWords: 3, voiceSeconds: 0.4, backoffSeconds: 1.2 },
    silenceTimeoutSeconds: 25,
    maxDurationSeconds: 300,
  };
}

export const ensureAssistantForNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      phoneNumberId: z.string().min(1),
      phoneNumber: z.string().optional(),
      contractorType: z.string().max(50).optional(),
      voiceId: z.string().max(60).optional(),
      firstMessage: z.string().max(2000).optional(),
      systemPrompt: z.string().max(8000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { business, businessId } = await loadBusinessForUser(context.supabase);
    if (!businessId) throw new Error("No business found for user");

    const { data: existing } = await context.supabase
      .from("vapi_number_assistants")
      .select("*")
      .eq("business_id", businessId)
      .eq("phone_number_id", data.phoneNumberId)
      .maybeSingle();

    if (existing?.assistant_id) {
      return { row: existing, created: false };
    }

    const tags = mergeTagDefaults(business);
    const name = `${tags.business ?? "Business"} – ${data.phoneNumber ?? "agent"}`.slice(0, 80);
    const first = applyTags(
      data.firstMessage ?? "Hi, thanks for calling {business}. How can I help today?",
      tags,
    );
    const prompt = applyTags(
      data.systemPrompt ??
        [
          "You are a friendly receptionist for {business}.",
          "Confirm the caller's name and reason for calling.",
          "If they want to book, offer: {book_consult}.",
          "Before ending, ask: Would you also like a text confirmation? This is optional; we'll call you back either way.",
          "If they say yes to text messages, SMS is still pending until they reply YES to the first confirmation text.",
          "Consent to receive SMS is not required to receive a callback, schedule service, or complete any transaction.",
          "Stay concise - keep replies to one or two short sentences.",
        ].join(" "),
      tags,
    );
    const voiceId = data.voiceId || (business as any)?.agent_voice_id || DEFAULT_VOICE_ID;

    const assistant = await vapi("/assistant", {
      method: "POST",
      body: JSON.stringify(defaultAssistantPayload(name, first, prompt, voiceId)),
    });

    // Link the assistant to the phone number on Vapi
    try {
      await vapi(`/phone-number/${data.phoneNumberId}`, {
        method: "PATCH",
        body: JSON.stringify({ assistantId: assistant.id }),
      });
    } catch {
      // Vapi may reject linking for some number types; ignore — UI still works.
    }

    const row = {
      business_id: businessId,
      phone_number_id: data.phoneNumberId,
      phone_number: data.phoneNumber ?? null,
      assistant_id: assistant.id,
      assistant_name: name,
      contractor_type_preset: data.contractorType ?? business?.contractor_type ?? null,
      custom_prompt: prompt,
      custom_first_message: first,
    };
    const { data: saved, error } = await context.supabase
      .from("vapi_number_assistants")
      .upsert(row, { onConflict: "business_id,phone_number_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row: saved, created: true };
  });

export const updateAssistantForNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      phoneNumberId: z.string().min(1),
      assistantName: z.string().max(80).optional(),
      systemPrompt: z.string().max(8000).optional(),
      firstMessage: z.string().max(2000).optional(),
      contractorType: z.string().max(50).optional(),
      voiceId: z.string().max(60).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { business, businessId } = await loadBusinessForUser(context.supabase);
    if (!businessId) throw new Error("No business found");
    const { data: existing } = await context.supabase
      .from("vapi_number_assistants")
      .select("*")
      .eq("business_id", businessId)
      .eq("phone_number_id", data.phoneNumberId)
      .single();
    if (!existing?.assistant_id) throw new Error("Assistant not provisioned yet for this number");
    const tags = mergeTagDefaults(business);
    const patch: Record<string, unknown> = {};
    if (data.assistantName) patch.name = data.assistantName;
    if (data.firstMessage !== undefined) patch.firstMessage = applyTags(data.firstMessage, tags);
    if (data.systemPrompt !== undefined) {
      patch.model = {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: applyTags(data.systemPrompt, tags) }],
      };
    }
    if (data.voiceId) {
      patch.voice = { provider: "11labs", voiceId: data.voiceId };
    }
    // Always re-apply the "don't interrupt" speaking plan on update so
    // older assistants get the new behavior the first time they're saved.
    patch.server = vapiServerConfig();
    patch.serverMessages = VAPI_SERVER_MESSAGES;
    patch.startSpeakingPlan = { waitSeconds: 0.6, smartEndpointingEnabled: true };
    patch.stopSpeakingPlan = { numWords: 3, voiceSeconds: 0.4, backoffSeconds: 1.2 };
    if (Object.keys(patch).length) {
      await vapi(`/assistant/${existing.assistant_id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    }
    if (data.voiceId) {
      await context.supabase
        .from("businesses")
        .update({ agent_voice_id: data.voiceId })
        .eq("id", businessId);
    }
    const { data: saved, error } = await context.supabase
      .from("vapi_number_assistants")
      .update({
        assistant_name: data.assistantName ?? existing.assistant_name,
        custom_prompt: data.systemPrompt ?? existing.custom_prompt,
        custom_first_message: data.firstMessage ?? existing.custom_first_message,
        contractor_type_preset: data.contractorType ?? existing.contractor_type_preset,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row: saved };
  });

export const listNumberAssistants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { businessId } = await loadBusinessForUser(context.supabase);
    if (!businessId) return { rows: [] };
    const { data } = await context.supabase
      .from("vapi_number_assistants")
      .select("*")
      .eq("business_id", businessId);
    return { rows: data ?? [] };
  });
