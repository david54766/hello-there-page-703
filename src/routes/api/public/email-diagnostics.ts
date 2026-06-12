import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getFirstServerEnv } from "@/lib/env.server";
import { hasResendConfig, sendResendEmail } from "@/lib/resend.server";

const Body = z.object({
  email: z.string().email(),
});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-CallRecover-Debug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const BRANDED_FROM = "CallRecover AI <noreply@callrecover.net>";
const FALLBACK_FROM = "CallRecover AI <onboarding@resend.dev>";

function renderHtml() {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f3ee;font-family:Arial,sans-serif;color:#171717;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:28px;border:1px solid #ece8df;">
    <h1 style="margin:0 0 8px;font-size:22px;">CallRecover Resend diagnostic</h1>
    <p style="margin:0;color:#737067;line-height:1.5;">This confirms the production backend can send through Resend.</p>
  </div>
</body></html>`;
}

export const Route = createFileRoute("/api/public/email-diagnostics")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      POST: async ({ request }) => {
        const debugSecret = getFirstServerEnv(["CALLRECOVER_ADMIN_TEST_SECRET", "VAPI_WEBHOOK_SECRET"]);
        if (!debugSecret || request.headers.get("x-callrecover-debug") !== debugSecret) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers });
        }

        if (!hasResendConfig()) {
          return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY is not configured" }), {
            status: 400,
            headers,
          });
        }

        const body = Body.parse(await request.json());
        const attempts: Array<{ from: string; ok: boolean; id?: string | null; error?: string }> = [];

        for (const from of [BRANDED_FROM, FALLBACK_FROM]) {
          try {
            const result = await sendResendEmail({
              from,
              to: body.email,
              subject: "CallRecover Resend diagnostic",
              html: renderHtml(),
            });
            attempts.push({ from, ok: true, id: result.id });
            return new Response(JSON.stringify({ ok: true, attempts }), { status: 200, headers });
          } catch (error) {
            attempts.push({ from, ok: false, error: error instanceof Error ? error.message : "send failed" });
          }
        }

        return new Response(JSON.stringify({ ok: false, attempts }), { status: 400, headers });
      },
    },
  },
});
