import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.vapi.ai";

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
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const assistantOverrides: Record<string, unknown> = {};
    if (data.systemPrompt && data.systemPrompt.trim()) {
      assistantOverrides.model = {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: data.systemPrompt.trim() }],
      };
    }
    if (data.firstMessage && data.firstMessage.trim()) {
      assistantOverrides.firstMessage = data.firstMessage.trim();
    }
    const call = await vapi("/call", {
      method: "POST",
      body: JSON.stringify({
        assistantId: data.assistantId,
        phoneNumberId: data.phoneNumberId,
        customer: { number: data.customerNumber },
        ...(Object.keys(assistantOverrides).length ? { assistantOverrides } : {}),
      }),
    });
    return { call };
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