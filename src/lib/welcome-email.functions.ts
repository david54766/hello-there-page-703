import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "CallRecover AI <noreply@callrecover.net>";

function renderHtml(email: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.06);">
        <tr><td style="background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);padding:32px 32px 28px;color:#fff;">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.18);text-align:center;line-height:40px;font-size:20px;">📞</div>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:600;letter-spacing:-.01em;">Welcome to CallRecover AI</h1>
          <p style="margin:0;font-size:14px;opacity:.92;">Never miss another lead from a missed call.</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi there,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Your account <strong>${email}</strong> is ready. In a moment you'll receive a separate email with a confirmation link — click it to verify your address and unlock your dashboard.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Here's what happens next:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;"><strong style="color:#0ea5e9;">1.</strong> &nbsp; Tell us about your business in a 2-minute onboarding</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:14px;"><strong style="color:#0ea5e9;">2.</strong> &nbsp; We provision your AI receptionist number</td></tr>
            <tr><td style="padding:10px 0;font-size:14px;"><strong style="color:#0ea5e9;">3.</strong> &nbsp; Forward your missed calls and start booking jobs</td></tr>
          </table>
          <div style="text-align:center;margin:0 0 8px;">
            <a href="https://callrecover.net/onboarding" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Go to onboarding →</a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Need a hand? Just reply to this email — a real human will get back to you.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;text-align:center;">
          CallRecover AI · <a href="https://callrecover.net" style="color:#64748b;text-decoration:none;">callrecover.net</a><br/>
          You're receiving this because you created an account at callrecover.net.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const lov = process.env.LOVABLE_API_KEY;
    const resend = process.env.RESEND_API_KEY;
    if (!lov || !resend) {
      console.warn("Welcome email skipped: missing LOVABLE_API_KEY or RESEND_API_KEY");
      return { ok: false as const, reason: "not_configured" as const };
    }
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lov}`,
        "X-Connection-Api-Key": resend,
      },
      body: JSON.stringify({
        from: FROM,
        to: [data.email],
        subject: "Welcome to CallRecover AI — let's get your line covered",
        html: renderHtml(data.email),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Resend welcome email failed:", res.status, text);
      return { ok: false as const, reason: "send_failed" as const };
    }
    return { ok: true as const };
  });