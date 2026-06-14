import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyTags, mergeTagDefaults, type TagValues } from "@/lib/tags";
import { DEFAULT_VOICE_ID } from "@/lib/voices";
import { DEFAULT_AGENT_NAME, getStandardScript } from "@/lib/contractor-data";

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
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET?.trim();
  return {
    url: `${publicBaseUrl()}/api/public/vapi/webhook`,
    timeoutSeconds: 20,
    ...(credentialId ? { credentialId } : {}),
    ...(!credentialId && webhookSecret ? { headers: { "X-Vapi-Secret": webhookSecret } } : {}),
  };
}

function bookingUrlForBusiness(business: Record<string, unknown> | null | undefined) {
  const value =
    (business as any)?.booking_url ||
    (business as any)?.cal_url ||
    (business as any)?.calendly_url ||
    null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildDefaultScript(
  business: Record<string, unknown> | null | undefined,
  contractorType?: string | null,
  agentName?: string | null,
) {
  const businessName =
    typeof (business as any)?.business_name === "string" ? (business as any).business_name : "";
  return getStandardScript(
    contractorType || ((business as any)?.contractor_type as string | null | undefined),
    businessName,
    {
      schedulingEnabled: Boolean((business as any)?.scheduling_enabled),
      bookingUrl: bookingUrlForBusiness(business),
      agentName,
    },
  );
}

async function buildScriptForVapi(
  supabase: any,
  business: Record<string, unknown>,
  contractorType?: string | null,
  agentName?: string | null,
) {
  const fallback = buildDefaultScript(business, contractorType, agentName);
  const businessId = (business as any)?.id;
  if (!businessId) return fallback;

  const activeType =
    contractorType || ((business as any)?.contractor_type as string | null | undefined) || null;
  const { data: templates } = await supabase
    .from("script_templates")
    .select("kind,body,contractor_type,is_default")
    .eq("business_id", businessId)
    .in("kind", ["first_message", "system"]);

  const pick = (kind: "first_message" | "system") => {
    const candidates = (templates ?? [])
      .filter((t: any) => {
        const type = t.contractor_type || null;
        return t.kind === kind && (!type || !activeType || type === activeType);
      })
      .sort((a: any, b: any) => {
        const aExact = activeType && a.contractor_type === activeType ? 0 : 1;
        const bExact = activeType && b.contractor_type === activeType ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aDefault = a.is_default ? 0 : 1;
        const bDefault = b.is_default ? 0 : 1;
        return aDefault - bDefault;
      });
    const body = candidates[0]?.body;
    return typeof body === "string" && body.trim() ? body.trim() : null;
  };

  return {
    firstMessage: pick("first_message") ?? fallback.firstMessage,
    systemPrompt: pick("system") ?? fallback.systemPrompt,
  };
}

function vapiRuntimePatch() {
  return {
    server: vapiServerConfig(),
    serverMessages: VAPI_SERVER_MESSAGES,
    backgroundSound: "off",
    // Let the assistant finish its sentence; don't yield on filler words.
    startSpeakingPlan: { waitSeconds: 0.6, smartEndpointingEnabled: true },
    stopSpeakingPlan: { numWords: 3, voiceSeconds: 0.4, backoffSeconds: 1.2 },
  };
}

function promptNeedsRefresh(prompt: string | null | undefined) {
  if (!prompt) return true;
  const hasStaleLanguage = [
    "{book_consult}",
    "If they want to book, offer",
    "How can I help today?",
    "friendly receptionist",
    "phone receptionist",
    "one confirmation SMS",
    "further SMS messages",
    "If they decline SMS",
    "SMS consent is required",
  ].some((needle) => prompt.includes(needle));
  return (
    hasStaleLanguage ||
    !prompt.includes("virtual assistant") ||
    !prompt.includes("text message confirmation") ||
    !prompt.includes("three direct outcomes")
  );
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

type VapiNumber = { id: string; number: string; name: string };

function mapVapiPhoneNumbers(data: any[]): VapiNumber[] {
  return data.map((n) => ({
    id: n.id,
    number: n.number ?? n.twilioPhoneNumber ?? "(no number)",
    name: n.name ?? "",
  }));
}

async function loadAssignedVapiPhoneIds(currentBusinessId?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("vapi_number_assistants")
    .select("business_id,phone_number_id")
    .not("phone_number_id", "is", null);
  if (error) throw new Error(error.message);

  return new Set(
    (data ?? [])
      .filter((row: any) => row.business_id !== currentBusinessId)
      .map((row: any) => row.phone_number_id)
      .filter(Boolean),
  );
}

async function assertVapiPhoneNumberAvailable(phoneNumberId: string, businessId: string) {
  const { data, error } = await supabaseAdmin
    .from("vapi_number_assistants")
    .select("business_id")
    .eq("phone_number_id", phoneNumberId)
    .neq("business_id", businessId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    throw new Error("That Vapi number is already assigned to another account.");
  }
}

async function listAssignableVapiNumbers(excludeIds = new Set<string>()) {
  const data = await vapi("/phone-number");
  return mapVapiPhoneNumbers(data as any[]).filter((number) => !excludeIds.has(number.id));
}

async function loadAccountAssistantRow(supabase: any, businessId: string) {
  const { data, error } = await supabase
    .from("vapi_number_assistants")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const listVapiPhoneNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { businessId } = await loadBusinessForUser(context.supabase);
    if (businessId) {
      const existing = await loadAccountAssistantRow(context.supabase, businessId);
      if (existing?.phone_number_id) {
        return {
          numbers: [{
            id: existing.phone_number_id,
            number: existing.phone_number ?? "(no number)",
            name: existing.assistant_name ?? "Account assistant",
          }],
        };
      }
    }

    const assignedIds = await loadAssignedVapiPhoneIds(businessId);
    const numbers = await listAssignableVapiNumbers(assignedIds);
    return { numbers: numbers.slice(0, 1) };
  });

export const createVapiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      customerNumber: z.string().min(5).max(20).regex(/^\+[1-9]\d{4,14}$/, "Use E.164 format e.g. +15551234567"),
      systemPrompt: z.string().max(8000).optional(),
      firstMessage: z.string().max(2000).optional(),
      tagOverrides: z.record(z.string(), z.string().max(500)).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { business, businessId } = await loadBusinessForUser(context.supabase);
    if (!businessId) throw new Error("No business found for user");
    const accountAssistant = await loadAccountAssistantRow(context.supabase, businessId);
    if (!accountAssistant?.assistant_id || !accountAssistant?.phone_number_id) {
      throw new Error("No account assistant is provisioned yet");
    }

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
        assistantId: accountAssistant.assistant_id,
        phoneNumberId: accountAssistant.phone_number_id,
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
    ...vapiRuntimePatch(),
    silenceTimeoutSeconds: 25,
    maxDurationSeconds: 300,
  };
}

export async function syncVapiAssistantsForBusiness(
  supabase: any,
  businessId: string,
  options: { linkPhoneNumbers?: boolean; forceRefresh?: boolean } = {},
) {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  if (businessError || !business) throw new Error(businessError?.message ?? "Business not found");

  const { data: rows, error: rowsError } = await supabase
    .from("vapi_number_assistants")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (rowsError) throw new Error(rowsError.message);

  const results: Array<{ id: string; assistantId: string | null; promptRefreshed: boolean; linked: boolean }> = [];
  const tags = mergeTagDefaults(business);
  for (const row of rows ?? []) {
    if (!(row as any).assistant_id) continue;
    const agentName = (row as any).assistant_name || DEFAULT_AGENT_NAME;
    const script = await buildScriptForVapi(supabase, business, (row as any).contractor_type_preset, agentName);
    const refreshPrompt = Boolean(options.forceRefresh) || promptNeedsRefresh((row as any).custom_prompt);
    const nextPrompt = refreshPrompt ? script.systemPrompt : (row as any).custom_prompt;
    const nextFirstMessage = refreshPrompt ? script.firstMessage : (row as any).custom_first_message;
    const shouldPatchPrompt =
      refreshPrompt ||
      Boolean((row as any).custom_prompt) ||
      Boolean((row as any).custom_first_message);
    const patch: Record<string, unknown> = {
      ...vapiRuntimePatch(),
      ...(shouldPatchPrompt
        ? {
            ...(nextFirstMessage ? { firstMessage: applyTags(nextFirstMessage, tags) } : {}),
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: applyTags(nextPrompt, tags) }],
            },
          }
        : {}),
    };

    await vapi(`/assistant/${(row as any).assistant_id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });

    let linked = false;
    if (options.linkPhoneNumbers && (row as any).phone_number_id) {
      await vapi(`/phone-number/${(row as any).phone_number_id}`, {
        method: "PATCH",
        body: JSON.stringify({ assistantId: (row as any).assistant_id }),
      });
      linked = true;
    }

    if (refreshPrompt) {
      await supabase
        .from("vapi_number_assistants")
        .update({
          custom_prompt: nextPrompt,
          custom_first_message: nextFirstMessage,
        })
        .eq("id", (row as any).id);
    }

    results.push({
      id: (row as any).id,
      assistantId: (row as any).assistant_id,
      promptRefreshed: refreshPrompt,
      linked,
    });
  }

  return { ok: true, count: results.length, results };
}

export const ensureAssistantForNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      phoneNumberId: z.string().min(1),
      phoneNumber: z.string().optional(),
      contractorType: z.string().max(50).optional(),
      assistantName: z.string().max(80).optional(),
      voiceId: z.string().max(60).optional(),
      firstMessage: z.string().max(2000).optional(),
      systemPrompt: z.string().max(8000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { business, businessId } = await loadBusinessForUser(context.supabase);
    if (!businessId) throw new Error("No business found for user");

    const existing = await loadAccountAssistantRow(context.supabase, businessId);

    if (existing?.assistant_id) {
      return { row: existing, created: false };
    }

    await assertVapiPhoneNumberAvailable(data.phoneNumberId, businessId);

    const tags = mergeTagDefaults(business);
    const agentName = data.assistantName?.trim() || DEFAULT_AGENT_NAME;
    const defaultScript = buildDefaultScript(business, data.contractorType, agentName);
    const name = agentName.slice(0, 80);
    const first = applyTags(
      data.firstMessage ?? defaultScript.firstMessage,
      tags,
    );
    const prompt = applyTags(
      data.systemPrompt ?? defaultScript.systemPrompt,
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
      assistant_name: agentName,
      contractor_type_preset: data.contractorType ?? business?.contractor_type ?? null,
      custom_prompt: prompt,
      custom_first_message: first,
    };
    const { data: saved, error } = await context.supabase
      .from("vapi_number_assistants")
      .upsert(row, { onConflict: "business_id" })
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
    const existing = await loadAccountAssistantRow(context.supabase, businessId);
    if (!existing?.assistant_id) throw new Error("Assistant not provisioned yet for this number");
    if (existing.phone_number_id !== data.phoneNumberId) {
      throw new Error("This account already has one Vapi number assigned");
    }
    const tags = mergeTagDefaults(business);
    const agentName = data.assistantName?.trim() || existing.assistant_name || DEFAULT_AGENT_NAME;
    const nameChanged = data.assistantName !== undefined && agentName !== existing.assistant_name;
    const defaultScript = buildDefaultScript(
      business,
      data.contractorType ?? existing.contractor_type_preset,
      agentName,
    );
    const canAutoRefreshPrompt =
      data.systemPrompt === undefined || data.systemPrompt === existing.custom_prompt;
    const canAutoRefreshFirst =
      data.firstMessage === undefined || data.firstMessage === existing.custom_first_message;
    const refreshScript =
      (promptNeedsRefresh(existing.custom_prompt) || nameChanged) &&
      canAutoRefreshPrompt &&
      canAutoRefreshFirst;
    const patch: Record<string, unknown> = {};
    if (data.assistantName) patch.name = agentName;
    if (refreshScript) {
      patch.firstMessage = applyTags(defaultScript.firstMessage, tags);
    } else if (data.firstMessage !== undefined) {
      patch.firstMessage = applyTags(data.firstMessage, tags);
    }
    if (data.systemPrompt !== undefined || refreshScript) {
      patch.model = {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: applyTags(refreshScript ? defaultScript.systemPrompt : data.systemPrompt, tags) }],
      };
    }
    if (data.voiceId) {
      patch.voice = { provider: "11labs", voiceId: data.voiceId };
    }
    Object.assign(patch, vapiRuntimePatch());
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
        assistant_name: agentName,
        custom_prompt: refreshScript ? defaultScript.systemPrompt : data.systemPrompt ?? existing.custom_prompt,
        custom_first_message: refreshScript ? defaultScript.firstMessage : data.firstMessage ?? existing.custom_first_message ?? defaultScript.firstMessage,
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
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(1);
    return { rows: data ?? [] };
  });
