import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendResendEmail } from "@/lib/resend.server";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function genCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!u || !d) return e;
  const head = u.slice(0, Math.min(2, u.length));
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

function maskPhone(p: string): string {
  const last = p.slice(-4);
  return `*** *** ${last}`;
}

async function sendEmailCode(to: string, code: string) {
  await sendResendEmail({
    from: "CallRecover AI <onboarding@resend.dev>",
    to,
    subject: `Your CallRecover verification code: ${code}`,
    html: `<div style="font-family:system-ui;padding:24px"><h2>Your verification code</h2><p style="font-size:32px;letter-spacing:4px;font-weight:600">${code}</p><p style="color:#666">This code expires in 10 minutes. If you didn't request it, ignore this email.</p></div>`,
  });
}

async function sendSmsCode(to: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error("SMS 2FA is not configured. Add Twilio secrets.");
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your CallRecover verification code is ${code}. It expires in 10 minutes.`,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SMS send failed (${res.status}): ${text}`);
  }
}

async function deliverCode(type: "email" | "sms", destination: string, code: string) {
  if (type === "email") return sendEmailCode(destination, code);
  return sendSmsCode(destination, code);
}

/** List the current user's MFA factors. */
export const listMyFactors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_mfa_factors")
      .select("id, factor_type, destination, enabled, verified, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { factors: data ?? [] };
  });

/** Create a factor row and send a verification code to confirm ownership. */
export const enrollFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      type: z.enum(["email", "sms"]),
      destination: z.string().min(3).max(255),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const dest = data.type === "email"
      ? data.destination.trim().toLowerCase()
      : data.destination.trim();

    if (data.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) {
      throw new Error("Invalid email address");
    }
    if (data.type === "sms" && !/^\+[1-9]\d{6,14}$/.test(dest)) {
      throw new Error("Phone must be E.164 (e.g. +15551234567)");
    }

    const { data: row, error } = await supabase
      .from("user_mfa_factors")
      .insert({ user_id: userId, factor_type: data.type, destination: dest })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create factor");

    const code = genCode();
    await supabaseAdmin.from("mfa_challenges").insert({
      user_id: userId,
      factor_id: row.id,
      code_hash: hashCode(code),
      destination_masked: data.type === "email" ? maskEmail(dest) : maskPhone(dest),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });

    await deliverCode(data.type, dest, code);
    return { factorId: row.id, masked: data.type === "email" ? maskEmail(dest) : maskPhone(dest) };
  });

/** Verify a code sent during enrollment; on success, enable the factor. */
export const verifyEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: ch } = await supabaseAdmin
      .from("mfa_challenges")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("user_id", userId)
      .eq("factor_id", data.factorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ch) throw new Error("No pending verification. Request a new code.");
    if (ch.consumed_at) throw new Error("Code already used. Request a new one.");
    if (new Date(ch.expires_at).getTime() < Date.now()) throw new Error("Code expired.");
    if (ch.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts.");

    if (ch.code_hash !== hashCode(data.code)) {
      await supabaseAdmin.from("mfa_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
      throw new Error("Incorrect code.");
    }
    await supabaseAdmin.from("mfa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    await supabaseAdmin
      .from("user_mfa_factors")
      .update({ verified: true, enabled: true })
      .eq("id", data.factorId)
      .eq("user_id", userId);
    return { ok: true };
  });

export const disableFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ factorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_mfa_factors")
      .delete()
      .eq("id", data.factorId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Step 1 of login: verify password (without persisting a session), and if the
 * user has 2FA enabled, send a code and return a challenge id. The client
 * should then prompt for the code and call verifyChallenge before completing
 * sign-in with supabase.auth.signInWithPassword.
 */
export const startChallenge = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().email(), password: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = (
      import.meta.env.VITE_SUPABASE_URL ||
      process.env.CALLRECOVER_URL ||
      process.env.CALLRECOVER_SUPABASE_URL ||
      process.env.SUPABASE_URL
    )!;
    const KEY = (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.CALLRECOVER_PUBLISHABLE_KEY ||
      process.env.CALLRECOVER_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY
    )!;
    // Verify credentials in an isolated client that does not persist a session.
    const probe = createClient(SUPABASE_URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: signIn, error } = await probe.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !signIn.user) {
      return { ok: false as const, reason: "invalid_credentials" as const };
    }
    const userId = signIn.user.id;
    // Sign back out of the probe client so it doesn't keep a refresh token.
    await probe.auth.signOut().catch(() => {});

    const { data: factors } = await supabaseAdmin
      .from("user_mfa_factors")
      .select("id, factor_type, destination")
      .eq("user_id", userId)
      .eq("enabled", true)
      .eq("verified", true)
      .order("created_at", { ascending: true });

    if (!factors || factors.length === 0) {
      return { ok: true as const, mfaRequired: false as const };
    }
    // Prefer email; fall back to first enabled.
    const f = factors.find((x) => x.factor_type === "email") ?? factors[0];
    const code = genCode();
    const masked = f.factor_type === "email" ? maskEmail(f.destination) : maskPhone(f.destination);

    const { data: chRow, error: chErr } = await supabaseAdmin
      .from("mfa_challenges")
      .insert({
        user_id: userId,
        factor_id: f.id,
        code_hash: hashCode(code),
        destination_masked: masked,
        expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      })
      .select("id")
      .single();
    if (chErr || !chRow) throw new Error(chErr?.message ?? "Could not start challenge");

    try {
      await deliverCode(f.factor_type as "email" | "sms", f.destination, code);
    } catch (e) {
      // Roll back the challenge so the user can retry cleanly.
      await supabaseAdmin.from("mfa_challenges").delete().eq("id", chRow.id);
      throw e;
    }
    return {
      ok: true as const,
      mfaRequired: true as const,
      challengeId: chRow.id,
      masked,
      factorType: f.factor_type as "email" | "sms",
    };
  });

/** Verify the login code. Returns ok=true if the client may now sign in. */
export const verifyChallenge = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: ch } = await supabaseAdmin
      .from("mfa_challenges")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!ch) throw new Error("Invalid challenge. Start sign-in again.");
    if (ch.consumed_at) throw new Error("Code already used.");
    if (new Date(ch.expires_at).getTime() < Date.now()) throw new Error("Code expired.");
    if (ch.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts.");
    if (ch.code_hash !== hashCode(data.code)) {
      await supabaseAdmin.from("mfa_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
      throw new Error("Incorrect code.");
    }
    await supabaseAdmin.from("mfa_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    return { ok: true };
  });
