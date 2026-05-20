# Phase 2 — AI Lead Qualification

Builds on the existing `calls`, `sms_threads`, `sms_messages` tables. Twilio webhooks are still pending campaign approval — we'll scaffold logic now and wire to live SMS later. AI uses Lovable AI Gateway (no key needed).

## 1. Database changes (single migration)

- `calls`: add `lead_status` enum (`open`, `contacted`, `scheduled`, `closed`) defaulting `open`; add `priority` enum (`normal`, `high`) defaulting `normal`; add `qualification jsonb` (service, urgency, callback_time, address, insurance_claim); add `ai_summary_short text`.
- New `callbacks` table: `id, business_id, call_id, caller_number, requested_at, scheduled_for, type (immediate|scheduled), status (pending|done|missed)`.
- New `notifications` table: `id, business_id, call_id, kind (sms|email|dashboard), title, body, read, created_at`. RLS: members read/update own business.
- New `suggested_replies` ephemeral table (or store inline on `sms_threads` as `jsonb suggestions`). Choice: inline on thread to keep simple.
- Add `notify_sms`, `notify_email`, `notify_dashboard` booleans on `businesses` + `notify_email_address text`.
- Enable realtime on `notifications` and `sms_messages`.

## 2. Server functions (`src/lib/*.functions.ts`)

- `qualifyLead` — given a call/thread, run Lovable AI (`google/gemini-3-flash-preview`) with structured output to extract `{ service_needed, urgency, callback_time, address, insurance_claim, summary_short }` from transcript + SMS history; updates `calls.qualification`, `ai_summary_short`, `urgency`.
- `detectEmergency` — keyword scan (leak, flooding, no AC, burst pipe, burning smell, gas, sparks, no heat) + AI confirm; sets `priority='high'` + `urgency='emergency'`, fires notification.
- `aiSmsReply` — generates next conversational SMS asking for the missing qualification field; returns draft (auto-send or contractor-approved based on business setting).
- `suggestReplies` — returns 3 contractor quick-reply options for the active thread.
- `scheduleCallback` — insert into `callbacks`, notify contractor.
- `updateLeadStatus` — change `lead_status`, write audit.
- `sendNotification` — fan-out to SMS (Twilio, stubbed), email (Resend connector — ask later), and dashboard realtime row.

All protected by `requireSupabaseAuth` except inbound webhook handlers.

## 3. Twilio webhook updates (scaffolded, deploy when SMS ready)

- `/api/public/twilio/sms` (incoming): append message → call `qualifyLead` + `detectEmergency` → if AI auto-reply enabled, call `aiSmsReply` and send via Twilio → emit `notifications` row.
- `/api/public/twilio/voice` (recording done): existing transcript flow → call `qualifyLead`.

## 4. UI

### Dashboard (`/dashboard`)
- Lead cards show: `ai_summary_short` (one-line), priority badge (red for HIGH), lead status pill, qualification chips (service, urgency, callback time, address).
- High-priority leads pinned top with subtle red accent.
- New top-right bell icon → dropdown of unread `notifications` (realtime).

### Lead detail drawer (new component, opens from card click)
- Full SMS thread (left), qualification panel (right).
- "Suggested replies" row — 3 AI buttons + free-text input → sends SMS.
- Status selector: Open / Contacted / Scheduled / Closed.
- "Schedule callback" — immediate or pick time.
- AI summary block at top.

### Settings (`/settings`)
- Notification preferences: SMS / Email / Dashboard toggles + email address field.
- "Auto-send AI replies" toggle (default on).

## 5. Notifications system

- Realtime subscription on `notifications` in `_authenticated` layout → toast + bell badge.
- Email via Resend connector (ask user to connect when ready).
- SMS via existing Twilio number (queued, sends when Twilio approved).

## Technical Notes

- AI calls: streaming not needed; use `generateText` + `Output.object` with Zod schema for qualification.
- Emergency keywords stored in `src/lib/emergency-keywords.ts` for fast pre-check before AI call.
- Lead status transitions enforced server-side (open→contacted→scheduled→closed; can reopen).
- Keep card UI dense but scannable — single line summary + chips, drawer for depth.
- No CRM-style pipelines, kanban, or reporting views.

## Open questions

1. Auto-send AI SMS replies, or always contractor-approved drafts? (default: auto-send, toggle in settings)
2. Email notifications now (requires Resend connector) or skip until you ask?
3. Should callback scheduling create a calendar event (ICS download) or just an in-app reminder?
