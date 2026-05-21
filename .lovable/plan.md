# Phase 3 — AI Contractor Front Desk

Extends the missed-call recovery base with **live AI answering**, **booking**, **multi-user dispatch**, **instant emergency alerts**, and a **revenue dashboard**. Stays focused: recover and convert leads. No CRM bloat.

## 1. AI Voice Answering (ElevenLabs)

Replace voicemail-only flow with a live AI agent that picks up missed/forwarded calls, qualifies the lead, books or escalates.

- **Provider**: ElevenLabs Conversational AI (WebRTC inbound via Twilio bridge once SMS+voice approved; until then, in-app browser test mode).
- **Agent prompt** (server-managed, per-business): contractor type (roofing/HVAC/plumbing/electrical), business hours, services, emergency triggers, booking link.
- **Tools exposed to agent** (via ElevenLabs client tools + server webhooks):
  - `qualify_lead` — writes `qualification` jsonb on `calls`.
  - `check_availability` — reads contractor calendar (HCP/Jobber).
  - `book_appointment` — creates job/visit.
  - `escalate_emergency` — fires alert pipeline.
- **Token endpoint**: `src/routes/api/voice/token.ts` returns ElevenLabs conversation token (requires `ELEVENLABS_API_KEY`).
- **In-app test page** `/voice-test` to talk to the agent from the browser before Twilio is live.
- **Call record**: each session writes a `calls` row with transcript, summary, qualification — reuses Phase 2 `qualifyLead`.

## 2. Appointment Scheduling

Two integrations wired up; both require OAuth tokens user adds via Settings.

- **Housecall Pro** (`HCP_API_KEY` per business) — REST API for customers, jobs, employees, availability.
- **Jobber** (OAuth 2.0; `JOBBER_CLIENT_ID/SECRET`) — GraphQL API for clients, requests, visits.
- `src/lib/scheduling.functions.ts`:
  - `listAvailability({ businessId, date })` — provider-agnostic.
  - `createAppointment({ businessId, callId, slot, customer })` — writes to chosen provider + local `appointments` table.
- New `appointments` table: `id, business_id, call_id, provider (hcp|jobber|internal), provider_ref, scheduled_for, customer_name, customer_phone, service, status (booked|completed|cancelled)`.
- Settings page gets "Scheduling provider" section with key/OAuth flow + which one is active.

## 3. Multi-User Dispatch (Round-Robin)

- New `dispatch_role` enum: `emergency`, `office`, `sales`.
- New `team_members` table: `id, business_id, user_id (nullable for non-app contacts), name, phone, email, role, active, last_assigned_at`.
- New `lead_assignments` table: `id, call_id, team_member_id, assigned_at, accepted_at, status`.
- **Routing logic** (`src/lib/dispatch.functions.ts → assignLead`):
  1. Determine target role: `emergency` if `priority='high'`, `sales` if new-customer/quote, else `office`.
  2. Pick active member in role with oldest `last_assigned_at` (round-robin), update timestamp.
  3. Insert `lead_assignments` row, fire notifications (SMS+email+dashboard) to that member.
  4. Fallback: if no member in role active, assign to business owner.
- Triggered automatically after `qualifyLead`, and manually from lead drawer "Reassign" dropdown.
- Settings → "Team" tab: add/edit members, toggle active, set roles.

## 4. Emergency Escalation

Builds on Phase 2 emergency detection. When `priority='high'`:

- Assign via dispatch to `emergency` role (round-robin within emergency members).
- Send **immediate SMS + email** to assigned member with one-tap callback link `/leads/$callId`.
- Dashboard shows red emergency banner with sound/notification (HTML5 Notification API + audio cue).
- Notification row marked `kind='emergency'` (new enum value) to render with red styling and persist until acknowledged.
- Add "Acknowledge" button in bell dropdown; logs to `lead_assignments.accepted_at`.

## 5. Revenue Dashboard

New `/dashboard` top section + `/revenue` detail route:

- **Stats cards** (computed via SQL view `business_metrics`):
  - Recovered calls (last 30d) = calls with `lead_status IN ('contacted','scheduled','closed')`.
  - Estimated jobs saved = recovered × `businesses.avg_job_value`.
  - Conversion rate = scheduled+closed / total calls.
  - Avg response time = avg(first outbound SMS time − call time).
- **Sparkline** of recovered calls per day (last 14d) — Recharts area chart, primary gradient.
- **Per-member leaderboard** (assignments closed) at bottom of `/revenue`.

## 6. Mobile-First Responsive Polish

- Dashboard: stat cards stack 1-col under 640px, lead cards single column, sticky top filter bar.
- Bottom tab bar on mobile (Leads / Revenue / Settings) replacing the sidebar at `md:` breakpoint.
- Lead drawer becomes full-screen sheet on mobile.
- Larger tap targets (min 44px), high-contrast emergency styling, sans-serif numerics for stats.

---

## Database changes (single migration)

```text
enums:
  dispatch_role: emergency | office | sales
  appointment_provider: hcp | jobber | internal
  appointment_status: booked | completed | cancelled
  notification_kind: + 'emergency'  (already has sms/email/dashboard)

tables:
  team_members(id, business_id, user_id?, name, phone, email, role, active, last_assigned_at, timestamps)
  lead_assignments(id, call_id, team_member_id, assigned_at, accepted_at?, status, timestamps)
  appointments(id, business_id, call_id?, provider, provider_ref, scheduled_for, customer_name, customer_phone, service, status, timestamps)

views:
  business_metrics — aggregated per business_id (recovered, est_value, conv_rate, avg_response_seconds)

RLS: members read/write within own business; owners-only delete on team_members.
Realtime: lead_assignments + appointments.
```

## Server functions

`src/lib/voice.functions.ts` — `mintAgentToken`, `startBrowserSession`, agent tool webhooks.
`src/lib/scheduling.functions.ts` — `listAvailability`, `createAppointment`, `listAppointments`.
`src/lib/dispatch.functions.ts` — `assignLead`, `reassignLead`, `acknowledgeAssignment`, `listTeamMembers`, `upsertTeamMember`.
`src/lib/metrics.functions.ts` — `getRevenueStats`, `getSparkline`, `getLeaderboard`.

All protected by `requireSupabaseAuth`.

## UI

```text
/dashboard            stats strip + leads list (with assigned-to chip)
/revenue              detailed metrics, sparkline, leaderboard
/leads/$callId        new dedicated lead page (mobile sheet, desktop split)
/settings/team        add/edit team members, roles, active
/settings/scheduling  pick provider, paste API key / OAuth
/settings/voice       agent prompt overrides, voice id, test button
/voice-test           browser session with the agent (dev/demo)
```

## Secrets needed (will request via add_secret when you confirm)

- `ELEVENLABS_API_KEY` — for voice agent + token minting.
- `HCP_API_KEY` — Housecall Pro (per-business; stored encrypted on `businesses` or a `provider_credentials` table — I'll use a small encrypted column).
- `JOBBER_CLIENT_ID` + `JOBBER_CLIENT_SECRET` — OAuth app credentials (one set workspace-wide; per-business refresh tokens stored).

Twilio voice bridge remains stubbed until your campaign is approved — the in-browser test path proves the agent end-to-end in the meantime.

## Out of scope (explicit)

- No pipeline/kanban view, no contact CRM, no invoicing, no reports builder.
- No native mobile app — responsive web only.
- Google Calendar / Calendly deferred (you chose HCP + Jobber).

## Open questions

1. Should the in-app browser voice agent be available to **all team members** or just admins?
2. For HCP/Jobber — paste API key in Settings (HCP) and full OAuth flow (Jobber), or start with just HCP API key and add Jobber OAuth after?
3. Emergency alert sound: built-in chime, or upload custom?
