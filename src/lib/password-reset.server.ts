import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { getFirstServerEnv } from "@/lib/env.server";
import { hasResendConfig, sendResendEmail } from "@/lib/resend.server";

const BRANDED_FROM = "CallRecover AI <noreply@callrecover.net>";
const FALLBACK_FROM = "CallRecover AI <onboarding@resend.dev>";
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
          CallRecover AI &middot; <a href="${APP_URL}" style="color:#171717;text-decoration:none;">callrecover.net</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPasswordResetEmail(email: string) {
  const safeEmail = email.trim().toLowerCase();
  if (!safeEmail) return { ok: true as const, sent: false as const };

  const linkResult = await generateRecoveryLink(safeEmail);

  // Do not reveal whether an account exists.
  if (!linkResult.link) {
    console.warn("Password reset link skipped:", linkResult.reason ?? "no action link");
    return sendSupabaseRecoveryEmail(safeEmail);
  }

  if (!hasResendConfig()) {
    console.warn("Password reset using Supabase sender: missing RESEND_API_KEY");
    return sendSupabaseRecoveryEmail(safeEmail);
  }

  try {
    await sendResendEmail({
      from: BRANDED_FROM,
      to: safeEmail,
      subject: "Reset your CallRecover AI password",
      html: renderResetHtml(linkResult.link),
    });
    return { ok: true as const, sent: true as const, channel: "resend" as const, from: BRANDED_FROM };
  } catch (error) {
    console.warn("Branded reset email failed; trying fallback sender:", error instanceof Error ? error.message : error);
  }

  try {
    await sendResendEmail({
      from: FALLBACK_FROM,
      to: safeEmail,
      subject: "Reset your CallRecover AI password",
      html: renderResetHtml(linkResult.link),
    });
    return { ok: true as const, sent: true as const, channel: "resend" as const, from: FALLBACK_FROM };
  } catch (error) {
    console.warn("Fallback reset email failed; trying Supabase recovery:", error instanceof Error ? error.message : error);
  }

  return sendSupabaseRecoveryEmail(safeEmail);
}

async function generateRecoveryLink(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });
    if (error || !data?.properties?.action_link) {
      return { link: null, reason: error?.message ?? "no action link" };
    }
    return { link: data.properties.action_link, reason: null };
  } catch (error) {
    return {
      link: null,
      reason: error instanceof Error ? error.message : "recovery link generation failed",
    };
  }
}

async function sendSupabaseRecoveryEmail(email: string) {
  const supabaseUrl = getFirstServerEnv(["VITE_SUPABASE_URL", "CALLRECOVER_SUPABASE_URL", "SUPABASE_URL"]);
  const supabaseKey = getFirstServerEnv([
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "CALLRECOVER_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase recovery email failed: missing public Supabase URL/key");
    return { ok: true as const, sent: false as const };
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/reset-password`,
    });
    if (error) {
      console.warn("Supabase recovery email failed:", error.message);
      return { ok: true as const, sent: false as const };
    }
    return { ok: true as const, sent: true as const, channel: "supabase" as const };
  } catch (error) {
    console.warn("Supabase recovery email failed:", error instanceof Error ? error.message : error);
    return { ok: true as const, sent: false as const };
  }
}
