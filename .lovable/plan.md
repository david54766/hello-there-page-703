## 1. Typical holidays field

Add `observed_holidays jsonb` to `businesses` (array of `{ name, date, recurring_yearly }`). Seed dropdown with US federal holidays (New Year's, MLK, Presidents, Memorial, Juneteenth, Independence, Labor, Columbus, Veterans, Thanksgiving, Christmas Eve, Christmas, NYE).

**UI:** Add "Observed holidays" card to `settings.tsx` (under Scheduling section) — multi-select of presets + custom add. On save, these auto-materialize as full-day entries in `schedule_blackouts` for the current + next year (reason: `Holiday: {name}`).

**Scheduling page:** holiday blackouts already render via existing `schedule_blackouts` query — no changes needed.

## 2. Two-factor authentication

Custom OTP-based 2FA (Supabase's built-in MFA only supports TOTP/phone enrollment, not email — and SMS MFA requires paid Twilio Verify integration on Supabase's side).

### Data
New table `user_mfa_factors`:
- `user_id`, `factor_type` ('email' | 'sms'), `destination` (email/phone), `enabled`, `verified`, timestamps
- RLS: users read/write only their own rows

New table `mfa_challenges`:
- `user_id`, `factor_id`, `code_hash` (sha256), `expires_at`, `consumed_at`, `attempts`
- RLS: server-only (no policies for authenticated; admin client only)

### Server functions (`src/lib/mfa.functions.ts`)
- `listMyFactors()` — return user's factors
- `enrollFactor({ type, destination })` — creates row, sends verification code
- `verifyEnrollment({ factorId, code })` — marks `verified=true, enabled=true`
- `disableFactor({ factorId })`
- `startChallenge({ email, password })` — verifies password via admin, picks user's enabled factor, sends code, returns `challengeId` + masked destination (does NOT sign user in)
- `verifyChallenge({ challengeId, code })` — on success returns a one-time session token; client exchanges it via `supabase.auth.signInWithPassword` (we re-run password sign-in only after code check passes)

Sending:
- **Email**: use existing `RESEND` setup if present, else Supabase admin invite/email — simplest: use `supabaseAdmin.auth.admin.generateLink` is overkill. Use a small SMTP/Resend call. **Decision:** use Resend if `RESEND_API_KEY` secret exists; otherwise fall back to Supabase Auth's built-in email by sending a magic link as the second factor. Since no Resend secret is configured, I'll request `RESEND_API_KEY` via `add_secret` before wiring email send.
- **SMS (Twilio)**: reuse existing `TWILIO_*` secrets and the same Twilio REST pattern from `sms.functions.ts`. Wired but UI-gated as "SMS 2FA" toggle.

### Login flow changes (`src/routes/login.tsx`)
1. Submit email+password → call `startChallenge` (server checks creds with admin client without creating session)
2. If user has no enabled factors → fall through to normal `signInWithPassword`
3. Else show OTP input; on submit call `verifyChallenge` → then call `signInWithPassword` client-side → navigate to dashboard

### Settings UI (`src/routes/_authenticated/settings.tsx`)
New "Security / Two-factor authentication" card:
- List current factors with enable/disable
- "Add email 2FA" — pre-fills user's email, sends code, verify input
- "Add SMS 2FA" — phone input, sends code via Twilio, verify input

## 3. Out of scope
- Recovery codes (can add later)
- TOTP/authenticator app (Supabase native MFA could be layered on later)
- Trusted-device "remember this browser for 30 days"

## Secrets needed
- `RESEND_API_KEY` (for email OTP delivery) — will request via `add_secret` before implementing email send
- Twilio secrets already present
