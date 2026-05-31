## Plan

### 1. Forgot password flow
- Add **"Forgot password?"** link on `src/routes/login.tsx` below the password field.
- Create `src/routes/forgot-password.tsx` — email input, calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/reset-password\` })`, shows success toast.
- Create `src/routes/reset-password.tsx` (public route) — detects Supabase recovery session, lets user set a new password via `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.

### 2. Auth emails via custom domain (callrecover.net)
The project has the custom domain `www.callrecover.net` but no email domain configured yet. To send signup confirmation, password reset, magic link, etc. from a `@callrecover.net` address, the email domain must first be set up (DNS records added + verified).

Once you complete the setup dialog below, I will:
- Scaffold branded React Email templates for all auth emails (signup confirmation, password reset, magic link, invite, email change, reauthentication) styled to match CallRecover.
- Deploy the `auth-email-hook` edge function so Supabase routes all auth emails through your callrecover.net sender.
- Verify the flow end-to-end.

### Action needed from you
Click the button below to configure the email domain (DNS verification happens in the background — I can scaffold the templates as soon as the domain is set, even while DNS is still verifying):

<presentation-actions>
<presentation-open-email-setup>Set up email domain</presentation-open-email-setup>
</presentation-actions>

After that completes, approve this plan and I'll implement the forgot/reset password pages and wire up the branded email templates.
