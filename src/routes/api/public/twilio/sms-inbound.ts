import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OPT_OUT = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const OPT_IN = new Set(["START", "SUBSCRIBE", "JOIN", "YES", "OPTIN", "BEGIN", "UNSTOP"]);
const HELP = new Set(["HELP", "INFO"]);

const HELP_REPLY =
  "Classroom Panda LLC dba CallRecover: Reply STOP to opt out. Msg & data rates may apply. Support: David@callrecover.net or (878) 234-0176. Privacy: https://callrecover.net/privacy-policy";
const OPT_IN_REPLY =
  "Classroom Panda LLC dba CallRecover: You are now subscribed to SMS updates for your service requests. Reply STOP to opt out, HELP for help. Msg & data rates may apply. Msg frequency varies. Privacy: https://callrecover.net/privacy-policy";
const OPT_OUT_REPLY =
  "Classroom Panda LLC dba CallRecover: You are unsubscribed and will not receive further messages. Reply START to resubscribe.";

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate Twilio's X-Twilio-Signature header.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  authToken: string,
  signatureHeader: string | null,
  fullUrl: string,
  params: Record<string, string>,
): boolean {
  if (!signatureHeader) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, key) => acc + key + params[key], fullUrl);
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/twilio/sms-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const raw = await request.text();
        const params = Object.fromEntries(new URLSearchParams(raw));
        const signature = request.headers.get("x-twilio-signature");

        // Twilio signs the public URL. Honor x-forwarded-* set by the platform.
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
        const url = new URL(request.url);
        const fullUrl = host ? `${proto}://${host}${url.pathname}` : request.url;

        if (!verifyTwilioSignature(authToken, signature, fullUrl, params)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const from = (params.From ?? "").trim();
        const to = (params.To ?? "").trim();
        const body = (params.Body ?? "").trim();
        const keyword = body.toUpperCase().replace(/[^A-Z]/g, "");
        if (!from || !to) return twiml();

        // Resolve which business owns this Twilio number.
        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("twilio_number", to)
          .maybeSingle();

        if (!biz) {
          // Number not provisioned to a business yet — acknowledge silently.
          return twiml();
        }

        // Find / create a thread to log this inbound.
        let threadId: string | null = null;
        const { data: thread } = await supabaseAdmin
          .from("sms_threads")
          .select("id")
          .eq("business_id", biz.id)
          .eq("caller_number", from)
          .maybeSingle();

        if (thread) {
          threadId = thread.id;
        } else {
          const { data: created } = await supabaseAdmin
            .from("sms_threads")
            .insert({ business_id: biz.id, caller_number: from } as any)
            .select("id")
            .single();
          threadId = created?.id ?? null;
        }

        if (threadId) {
          await supabaseAdmin.from("sms_messages").insert({
            thread_id: threadId,
            direction: "inbound",
            body,
          } as any);
          await supabaseAdmin
            .from("sms_threads")
            .update({ last_message_at: new Date().toISOString() } as any)
            .eq("id", threadId);
        }

        // Keyword handling.
        if (OPT_OUT.has(keyword)) {
          await supabaseAdmin.from("sms_consents").insert({
            business_id: biz.id,
            caller_number: from,
            status: "opted_out",
            keyword,
          } as any);
          // Twilio's Advanced Opt-Out also sends its own STOP confirmation;
          // returning an empty TwiML avoids a duplicate. If you've disabled
          // Advanced Opt-Out, swap to: return twiml(OPT_OUT_REPLY);
          return twiml();
        }

        if (OPT_IN.has(keyword)) {
          await supabaseAdmin.from("sms_consents").insert({
            business_id: biz.id,
            caller_number: from,
            status: "opted_in",
            keyword,
          } as any);
          return twiml(OPT_IN_REPLY);
        }

        if (HELP.has(keyword)) {
          return twiml(HELP_REPLY);
        }

        // Regular inbound — already logged. No auto-reply here; the operator
        // (or downstream automation) handles conversational replies.
        return twiml();
      },
    },
  },
});