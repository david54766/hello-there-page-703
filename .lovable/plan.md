
# Plan: Vapi tagging, auto-assistant, script library, scheduling

Four work streams, in order. Each ships independently.

---

## 1. Quick-tag system (inbound + outbound)

Standard merge tags resolved at call time from **business defaults**, with **per-call overrides**.

Supported tags:
`{name}` `{business}` `{address}` `{website}` `{book_consult}` `{callback_form}` `{sms_consent}` `{hello_script}` `{website_info}`

Where values live:
- New columns on `businesses`: `website`, `website_blurb`, `booking_url`, `callback_form_url`, `sms_consent_text`, `default_hello_script`.
- Per-call overrides live in component state on the Vapi page (and are passed into `assistantOverrides`).

UI in `src/routes/_authenticated/vapi.tsx`:
- "Insert tag" dropdown next to First message and Script textareas — inserts `{tag}` at cursor.
- Small "Tag values" accordion showing what each tag will resolve to for this call, with inline override inputs.
- Server-side substitution in `createVapiCall` before forwarding to Vapi: load business row → merge defaults + overrides → replace tokens in `firstMessage` and `systemPrompt`.

---

## 2. Auto-create one Vapi assistant per phone number (customizable)

New columns on `businesses` (or a small `vapi_number_assistants` table keyed by `phone_number_id`):
- `assistant_id`, `assistant_name`, `contractor_type_preset`, `custom_prompt`, `custom_first_message`.

New server fns in `src/lib/vapi.functions.ts`:
- `ensureAssistantForNumber({ phoneNumberId, contractorType? })` — if no assistant linked, POST `/assistant` using the contractor-type template + business tag defaults, then PATCH the phone number to link it. Idempotent.
- `updateAssistant({ phoneNumberId, name?, prompt?, firstMessage?, contractorType? })` — PATCH `/assistant/{id}`.

UI: a new "Numbers & assistants" section on the Vapi page listing each Vapi number with its assistant, contractor type dropdown, prompt/first-message editor, and "Reset to template" button. First load auto-runs `ensureAssistantForNumber` for any number missing one.

---

## 3. Script library per contractor type (user-editable)

New table `script_templates`:
- `id`, `business_id`, `contractor_type`, `kind` ('hello' | 'system' | 'first_message'), `label`, `body`, `is_default`, timestamps. RLS: members read/write own business.

Seeded with a curated starter set per contractor type (HVAC, plumbing, electrical, roofing, landscaping, general — drawn from `src/lib/contractor-data.ts`).

UI:
- New page `src/routes/_authenticated/scripts.tsx` — CRUD for templates per contractor type with `{tag}` insert helper.
- On Vapi page: "Load template" dropdown beside First message and Script, filtered to the business's contractor type. Loading a template just fills the textarea — user can still edit.

---

## 4. Scheduling tab — multi-agent calendar

New page `src/routes/_authenticated/scheduling.tsx`, gated by a business flag `scheduling_enabled` (toggle in Settings; off by default per "only enabled if contractor asks").

### Data model
- Extend `team_members` with availability JSON (weekly hours per agent).
- New `schedule_blackouts` table: `business_id`, `team_member_id` (nullable = whole business), `start_at`, `end_at`, `reason`.
- Extend `appointments` with `team_member_id`, `source` ('vapi_call' | 'manual' | 'google' | 'cal'), `external_event_id`, `external_provider`.

### UI
- Month/week calendar (shadcn calendar + custom grid) showing all agents' appointments color-coded, plus blackout overlays.
- "New appointment" dialog: agent picker (filters out double-bookings + blackouts), service, customer, time slot.
- "Blackout dates" manager.
- When a Vapi call is marked "booked consultation" (manual button on Recent calls row), it creates an appointment and locks that slot.

### Integrations (per-business, optional)
- **Google Calendar (2-way)**: per-user OAuth (Google Cloud Console credentials, scopes `calendar.events` + `calendar.readonly`). Store refresh token per `team_member` in new `calendar_connections` table. On appointment create → push event; nightly + webhook pull of busy times to block slots.
- **Cal.com / Calendly link-out**: just two URL fields on `businesses` (`cal_url`, `calendly_url`) — surfaced as "Book" buttons and substitutable as `{book_consult}` tag. No native sync.

Settings page gets a "Scheduling" section: enable toggle, link-out URLs, Google Calendar connect button per team member.

---

## 5. Website-info tag

Already covered above: `website` + `website_blurb` on `businesses`, surfaced through `{website}` and `{website_info}` tags, with a "If asked, share website" toggle on the script editor that prepends a small instruction block to the system prompt.

---

## Technical notes (collapsed for non-technical readers)

- Migrations: 1 for `businesses` column adds, 1 for `script_templates`, 1 for `schedule_blackouts` + `appointments`/`team_members` extensions, 1 for `calendar_connections`. All with grants + RLS scoped via `is_business_member`.
- Google Calendar uses per-user OAuth (not the workspace connector) because each contractor needs their own calendar — credentials configured by the contractor in Settings.
- Tag substitution happens server-side in `createVapiCall` so overrides can't be bypassed and so we can log what was actually sent.
- The Vapi page gets split into tabs: **Place call · Numbers & assistants · Recent calls** to keep it readable.

---

## Out of scope for this pass
- Outlook/Microsoft Graph sync (can be added later — symmetric to Google flow).
- SMS-based consultation booking confirmations (separate task — would reuse existing Twilio SMS).
- Recurring blackouts (only one-off date ranges in v1).
