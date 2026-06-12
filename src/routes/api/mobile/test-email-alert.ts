import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { sendResendEmail } from "@/lib/resend.server";

const BRANDED_FROM = "CallRecover AI <noreply@callrecover.net>";
const FALLBACK_FROM = "CallRecover AI <onboarding@resend.dev>";

function renderHtml() {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece8df;">
        <tr><td style="background:#171717;padding:28px;color:#fff;">
          <div style="display:inline-block;width:40px;height:40px;border-radius:12px;background:#d6a84f;color:#171717;text-align:center;line-height:40px;font-size:16px;font-weight:700;">CR</div>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:700;">CallRecover email test</h1>
          <p style="margin:0;font-size:14px;color:#d6d3ca;">Resend delivery is connected for this account.</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">This is a test email sent from the CallRecover production backend.</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#737067;">If this appears in Resend activity, direct API delivery is working.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const Route = createFileRoute("/api/mobile/test-email-alert")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { userEmail } = await requireMobileSupabase(request);
          if (!userEmail) return jsonResponse({ error: "Signed-in email not found" }, 400);

          try {
            const result = await sendResendEmail({
              from: BRANDED_FROM,
              to: userEmail,
              subject: "CallRecover AI email test",
              html: renderHtml(),
            });
            return jsonResponse({ ok: true, from: BRANDED_FROM, id: result.id });
          } catch (error) {
            console.warn("Branded test email failed; trying fallback sender:", error instanceof Error ? error.message : error);
          }

          const result = await sendResendEmail({
            from: FALLBACK_FROM,
            to: userEmail,
            subject: "CallRecover AI email test",
            html: renderHtml(),
          });
          return jsonResponse({ ok: true, from: FALLBACK_FROM, id: result.id });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Email test failed" }, 400);
        }
      },
    },
  },
});
