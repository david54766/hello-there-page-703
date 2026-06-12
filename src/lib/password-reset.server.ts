import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "CallRecover AI <noreply@callrecover.net>";
const APP_URL = "https://callrecover.net";

function renderResetHtml(link: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(23,23,23,.08),0 12px 30px rgba(23,23,23,.10);">
        <tr><td style="background:#171717;padding:32px;color:#fff;">
          <div style="display:inline-block;width:42px;height:42px;border-radius:12px;background:#d6a84f;color:#171717;text-align:center;line-height:42px;font-size:20px;font-weight:700;">CR</div>
          <h1 style="margin:18px 0 4px;font-size:24px;font-weight:700;letter-spacing:-.02em;">Reset your CallRecover password</h1>
          <p style="margin:0;font-size:14px;color:#d6d3ca;">Secure access for your missed-call recovery workspace.</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We received a request to reset your CallRecover AI password.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Use the button below to set a new password. If you did not request this, you can ignore this email.</p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${link}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;border:1px solid #d6a84f;">Set new password</a>
          </div>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#737067;">If the button does not work, paste this URL into your browser:<br/><a href="${link}" style="color:#171717;word-break:break-all;">${link}</a></p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8f7f3;border-top:1px solid #ece8df;font-size:12px;color:#737067;text-align:center;">
          CallRecover AI · <a href="${APP_URL}" style="color:#171717;text-decoration:none;">callrecover.net</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPasswordResetEmail(email: string) {
  const safeEmail = email.trim().toLowerCase();
  if (!safeEmail) return { ok: true as const, sent: false as const };

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: safeEmail,
    options: { redirectTo: `${APP_URL}/reset-password` },
  });

  // Do not reveal whether an account exists.
  if (error || !data?.properties?.action_link) {
    console.warn("Password reset link skipped:", error?.message ?? "no action link");
    return { ok: true as const, sent: false as const };
  }

  const lov = process.env.LOVABLE_API_KEY;
  const resend = process.env.RESEND_API_KEY;
  if (!lov || !resend) {
    throw new Error("Password reset email is not configured. Add LOVABLE_API_KEY and RESEND_API_KEY.");
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
      to: [safeEmail],
      subject: "Reset your CallRecover AI password",
      html: renderResetHtml(data.properties.action_link),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Reset email failed: ${res.status} ${text.slice(0, 180)}`);
  }

  return { ok: true as const, sent: true as const };
}
