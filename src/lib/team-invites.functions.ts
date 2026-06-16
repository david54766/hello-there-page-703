import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getFirstServerEnv } from "@/lib/env.server";
import { hasResendConfig, sendResendEmail } from "@/lib/resend.server";

const BRANDED_FROM = "CallRecover AI <noreply@callrecover.net>";
const FALLBACK_FROM = "CallRecover AI <onboarding@resend.dev>";

function publicAppUrl() {
  return (
    getFirstServerEnv(["CALLRECOVER_PUBLIC_URL", "PUBLIC_APP_URL"]) ??
    "https://callrecover.net"
  ).replace(/\/+$/, "");
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function inviteHtml({ businessName, memberName, inviteUrl }: { businessName: string; memberName: string; inviteUrl: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(23,23,23,.08),0 12px 30px rgba(23,23,23,.10);">
        <tr><td style="background:#171717;padding:32px;color:#fff;">
          <div style="display:inline-block;width:42px;height:42px;border-radius:12px;background:#d6a84f;color:#171717;text-align:center;line-height:42px;font-size:20px;font-weight:700;">CR</div>
          <h1 style="margin:18px 0 4px;font-size:24px;font-weight:700;letter-spacing:-.02em;">You're invited to CallRecover</h1>
          <p style="margin:0;font-size:14px;color:#d6d3ca;">${businessName} added ${memberName} as a team member.</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Use this secure link to access only the calls, appointments, and activity assigned to you.</p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;font-size:14px;border:1px solid #d6a84f;">Accept invite</a>
          </div>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#737067;">If the button does not work, paste this URL into your browser:<br/><a href="${inviteUrl}" style="color:#171717;word-break:break-all;">${inviteUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const inviteTeamMemberLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ teamMemberId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: member, error: memberError } = await context.supabase
      .from("team_members")
      .select("id,business_id,name,email,user_id")
      .eq("id", data.teamMemberId)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member) throw new Error("Team member not found");
    if (!member.email) throw new Error("Add an email to this team member before inviting them.");
    if (member.user_id) return { ok: true, alreadyLinked: true, inviteUrl: null, emailSent: false };

    const { data: roleRows, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("business_id", member.business_id)
      .eq("user_id", context.userId)
      .in("role", ["admin", "staff"]);
    if (roleError) throw new Error(roleError.message);
    if (!roleRows?.length) throw new Error("Only tenant admins can invite team logins.");

    const { data: business } = await context.supabase
      .from("businesses")
      .select("business_name")
      .eq("id", member.business_id)
      .maybeSingle();

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashInviteToken(token);
    const inviteUrl = `${publicAppUrl()}/accept-team-invite?token=${encodeURIComponent(token)}`;

    await supabaseAdmin
      .from("team_member_invites")
      .update({ status: "revoked" })
      .eq("team_member_id", member.id)
      .eq("status", "pending");

    const { error: inviteError } = await supabaseAdmin.from("team_member_invites").insert({
      business_id: member.business_id,
      team_member_id: member.id,
      email: member.email.trim().toLowerCase(),
      role: "agent",
      token_hash: tokenHash,
      invited_by: context.userId,
    } as any);
    if (inviteError) throw new Error(inviteError.message);

    let emailSent = false;
    if (hasResendConfig()) {
      const html = inviteHtml({
        businessName: business?.business_name ?? "your business",
        memberName: member.name ?? "your team member",
        inviteUrl,
      });
      try {
        await sendResendEmail({
          from: BRANDED_FROM,
          to: member.email,
          subject: "You have been invited to CallRecover AI",
          html,
        });
        emailSent = true;
      } catch {
        await sendResendEmail({
          from: FALLBACK_FROM,
          to: member.email,
          subject: "You have been invited to CallRecover AI",
          html,
        });
        emailSent = true;
      }
    }

    return { ok: true, alreadyLinked: false, inviteUrl, emailSent };
  });

export const acceptTeamMemberInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().min(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const tokenHash = hashInviteToken(data.token);
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("team_member_invites")
      .select("id,business_id,team_member_id,email,role,status,expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (inviteError) throw new Error(inviteError.message);
    if (!invite || invite.status !== "pending") throw new Error("Invite is no longer valid.");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite has expired.");

    const signedInEmail = String((context.claims as any)?.email ?? "").trim().toLowerCase();
    if (signedInEmail && signedInEmail !== invite.email.trim().toLowerCase()) {
      throw new Error(`This invite is for ${invite.email}. Sign in with that email to accept it.`);
    }

    const { error: membershipError } = await supabaseAdmin
      .from("business_members")
      .upsert({ business_id: invite.business_id, user_id: context.userId } as any, { onConflict: "business_id,user_id" });
    if (membershipError) throw new Error(membershipError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { business_id: invite.business_id, user_id: context.userId, role: invite.role } as any,
        { onConflict: "user_id,business_id,role" },
      );
    if (roleError) throw new Error(roleError.message);

    const { error: teamError } = await supabaseAdmin
      .from("team_members")
      .update({ user_id: context.userId })
      .eq("id", invite.team_member_id)
      .eq("business_id", invite.business_id);
    if (teamError) throw new Error(teamError.message);

    const { error: updateError } = await supabaseAdmin
      .from("team_member_invites")
      .update({
        status: "accepted",
        accepted_by: context.userId,
        accepted_at: new Date().toISOString(),
      } as any)
      .eq("id", invite.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true, businessId: invite.business_id };
  });
