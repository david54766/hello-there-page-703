import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Body = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().min(7).max(20),
  consent: z.literal(true),
});

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8) return `+${digits}`;
  return null;
}

const CONSENT_TEXT =
  "By checking this box and submitting, I agree to receive SMS messages from Classroom Panda LLC dba CallRecover related to my service request, appointment scheduling, and lead follow-up at the phone number provided. Message frequency varies. Message & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See https://callrecover.net/privacy-policy and https://callrecover.net/terms.";

export const Route = createFileRoute("/api/public/sms-opt-in")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors });
        }
        const parsed = Body.safeParse(json);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "You must enter your name, phone, and check the consent box." }),
            { status: 400, headers: cors },
          );
        }
        const phone = toE164(parsed.data.phone);
        if (!phone) {
          return new Response(JSON.stringify({ error: "Enter a valid US phone number." }), { status: 400, headers: cors });
        }

        // Resolve a business to attach the consent to. Prefer the business that
        // owns the public CallRecover number; fall back to the first business.
        const { data: byPhone } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .or("business_phone.eq.+18782340176,twilio_number.eq.+18782340176")
          .limit(1)
          .maybeSingle();
        let businessId = byPhone?.id ?? null;
        if (!businessId) {
          const { data: first } = await supabaseAdmin
            .from("businesses")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          businessId = first?.id ?? null;
        }
        if (!businessId) {
          return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503, headers: cors });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const ua = request.headers.get("user-agent");

        const { error } = await supabaseAdmin.from("sms_consents").insert({
          business_id: businessId,
          caller_number: phone,
          status: "opted_in",
          keyword: "WEB_FORM",
          source: "web_form:/sms-opt-in",
          consent_text: CONSENT_TEXT,
          full_name: parsed.data.full_name,
          ip_address: ip,
          user_agent: ua,
        } as any);

        if (error) {
          return new Response(JSON.stringify({ error: "Could not record consent." }), { status: 500, headers: cors });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
      },
    },
  },
});