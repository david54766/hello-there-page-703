# CallRescue AI — Build Plan

Replace the placeholder hello page and ship a modern SaaS platform that helps contractors recover missed calls via AI voicemail transcription + instant SMS recovery.

## 1. Foundation

- Delete the hello content in `src/routes/index.tsx`; turn it into a marketing landing page (hero, value props, CTA → `/signup`).
- Enable Lovable Cloud (Supabase) for DB, Auth, and Edge Functions.
- Design system in `src/styles.css` (oklch tokens): clean white surfaces, deep slate text, single saturated accent (electric blue), subtle gradients, soft shadows, generous spacing. Typography: Inter-alternative pair (e.g. `space-grotesk-dm-sans`). Framer-motion for subtle entrance + card hovers.
- App shell: sidebar nav (Dashboard, Leads, Settings), top bar with business switcher + user menu.

## 2. Auth & Multi-Tenancy

- Email/password + Google sign-in via Lovable broker.
- Tables (all RLS-on, scoped via `business_members.user_id = auth.uid()`):
  - `businesses` (id, business_name, contractor_type, business_phone, owner_phone, business_hours jsonb, carrier, twilio_number, onboarding_complete)
  - `business_members` (business_id, user_id, role) — role isolated from profiles
  - `user_roles` enum `app_role` (`admin`, `staff`) + `has_role()` SECURITY DEFINER fn
  - `calls` (business_id, caller_number, recording_url, transcript, ai_summary jsonb, urgency, callback_requested, status, created_at)
  - `sms_threads` (business_id, caller_number, last_message_at) + `sms_messages` (thread_id, direction, body, created_at)
  - `forwarding_tests` (business_id, completed, timestamp)
- Policies: members read/write their business rows only; admin role required for settings mutations.

## 3. Onboarding Wizard (`/onboarding`)

Stepper component with progress bar + framer-motion transitions:
1. Business name
2. Contractor type (17-option dropdown)
3. Business phone (E.164 input)
4. Owner cell phone
5. Carrier dropdown (7 options)
6. Carrier-specific forwarding instructions — dial codes table keyed by carrier (e.g. Verizon `*72`, AT&T `**21*`, T-Mobile `**21*`, Google Voice in-app, etc.) with copy buttons + step list. Twilio number provisioned for business shown here.
7. "Test My Setup" — calls server fn that polls `forwarding_tests` for an incoming Twilio test call to the assigned number; green success state when detected.
- Final: "Your missed calls are now protected." → `/dashboard`.
- Persist progress so refresh resumes at last step.

## 4. Dashboard (`/dashboard`)

- Top stat cards (animated count-up): Recovered Calls, Potential Revenue Saved (configurable avg ticket × recovered), Response Rate %, Open Leads.
- Live Activity Feed (Supabase realtime on `calls`): cards with caller name, phone, AI summary, urgency badge (low/med/high/emergency colors), timestamp (relative), callback-requested chip.
- Per-card actions: Call Now (`tel:`), Send Text (opens SMS drawer with thread + quick-replies), Mark Resolved (status update).
- Empty + loading states.

## 5. Missed-Call Workflow (Edge Functions)

Public Twilio webhooks under `src/routes/api/public/twilio/*`:
- `incoming-call` — TwiML: dial owner for 20s, on no-answer → record voicemail with contractor-friendly prompt.
- `recording-complete` — store recording URL, insert `calls` row, enqueue AI processing.
- `process-voicemail` (server fn / edge) — call OpenAI Whisper to transcribe, then GPT to extract `{ name, service_needed, urgency, callback_requested, summary }`; update row.
- `send-recovery-sms` — lookup carrier line type (Twilio Lookup); if mobile, send contractor-type-specific template with quick-reply keywords (CALL/SCHEDULE/TEXT). Skip if landline.
- `incoming-sms` — append to `sms_messages`, route quick replies, notify dashboard via realtime.
- `forwarding-test` — marks `forwarding_tests.completed=true` for the business when a test call arrives.

SMS templates table seeded per contractor_type (roofing/plumbing/HVAC examples in spec, generic fallback for others).

## 6. Settings (`/settings`)

- Business profile, owner phone, carrier (re-show forwarding instructions).
- SMS template overrides per contractor type.
- Team members (admin invites staff).
- Average job value (drives revenue stat).

## 7. Secrets Required

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER_POOL` (or auto-provision via API)
- `OPENAI_API_KEY` (or use Lovable AI Gateway — preferred; ask if user wants OpenAI direct vs gateway)

## 8. Polish

- Mobile-first responsive (sidebar collapses to bottom nav).
- Skeletons everywhere, toast feedback (sonner), error boundaries already wired.
- SEO meta per route, single H1, semantic HTML.

## Technical Notes

- All Twilio + OpenAI work happens server-side (TanStack server fns + `/api/public/*` for Twilio webhooks with signature verification using `TWILIO_AUTH_TOKEN`).
- Use `requireSupabaseAuth` middleware for dashboard server fns; `supabaseAdmin` only in webhooks after signature verification.
- Realtime subscription on `calls` table filtered by `business_id` powers live feed.
- File structure: `src/routes/(marketing)/index.tsx`, `src/routes/_authenticated/{dashboard,leads,settings}.tsx`, `src/routes/onboarding.tsx`, `src/routes/api/public/twilio/*.ts`, `src/lib/{calls,sms,onboarding}.functions.ts`.

## Open Questions

1. **AI provider**: use Lovable AI Gateway (default, no key needed) or your own OpenAI key?
2. **Twilio numbers**: auto-provision a new number per business on signup, or use a shared pool?
3. **Pricing/avg job value** for "Potential Revenue Saved" — fixed default ($500) or per-business setting?

I'll assume Lovable AI Gateway + auto-provision Twilio numbers + per-business avg job value (default $500) unless you say otherwise.
