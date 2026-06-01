## Goal

Make a new client's AI agent fully usable the moment onboarding ends: a voice they approved, a trade-tailored script they approved, calm "let me finish" behavior, and an automatic booking offer if scheduling is on.

## Changes

### 1. Trade-tailored standard scripts (`src/lib/contractor-data.ts`)

Add a `getStandardScript(contractorType, businessName, { schedulingEnabled, bookingUrl })` helper that returns `{ firstMessage, systemPrompt }`.

Template (all trades), kept short and direct:

> "Thanks for calling **{business}**. All of our {trade-word} are on another line right now — but I can take your details and pass them along immediately so they get back to you as fast as possible."

Then prompt rules baked into systemPrompt:
- Keep every reply to one or two short sentences.
- Always confirm caller's name and best callback number first.
- Ask one qualifying question appropriate to the trade (e.g. roofing → "Is this a leak or general repair?", plumbing → "Is water actively running or contained?", HVAC → "Are you currently without heat/cool?").
- If `schedulingEnabled` and `bookingUrl` exist: after capturing details, offer "Would you like me to book a quick consultation right now?" and, on yes, share/use the booking link.
- If not enabled: close with "I'll have someone call you back shortly."
- Never argue, never repeat, hand off if frustrated.

Per-trade word swap: roofers → "roofers", plumbers → "plumbers", etc., with a sensible fallback ("technicians").

### 2. Voice picker

- Curated list of 4 ElevenLabs voices (2 female, 2 male — e.g. Rachel, Bella, Adam, Antoni) defined in a new `src/lib/voices.ts` with `{ id, label, gender, previewUrl }`. Preview URLs come from ElevenLabs' public sample MP3s.
- Persist the choice to `businesses.agent_voice_id` (column already exists).

### 3. Vapi assistant payload updates (`src/lib/vapi.functions.ts`)

In `defaultAssistantPayload` and `updateAssistantForNumber`:
- `voice: { provider: "11labs", voiceId: <chosen or default> }` driven by `business.agent_voice_id`.
- Add `startSpeakingPlan: { waitSeconds: 0.6, smartEndpointingEnabled: true }` so the assistant doesn't jump in.
- Add `stopSpeakingPlan: { numWords: 3, voiceSeconds: 0.4, backoffSeconds: 1.2 }` so brief "uh-huh"s don't cut it off — the caller has to actually start a sentence before the assistant yields.
- Add `silenceTimeoutSeconds: 25` and `maxDurationSeconds: 300` as safety rails.
- Extend `ensureAssistantForNumber` and `updateAssistantForNumber` to accept `voiceId`, `firstMessage`, `systemPrompt`, `schedulingEnabled`, `bookingUrl` and apply them in the create/patch payload.

### 4. Onboarding flow (`src/routes/onboarding.tsx`)

New step order:

```text
Business → Type → Business phone → Your cell → Carrier →
AI agent (provision) → Voice (pick & preview) →
Script (review & approve) → Forwarding → Test
```

- **Voice step:** 2×2 grid of voice cards, each with a Play button that plays the preview MP3 inline (HTML `<audio>`). Saves `agent_voice_id` and patches the Vapi assistant. Continue is disabled until a voice is played at least once and selected.
- **Script step:** shows the generated `firstMessage` and a collapsed view of the `systemPrompt` for the user's trade, with one editable textarea for the first message. A small note: "Scheduling is **on** — callers will be offered a booking link" or "**off** — turn it on in Scheduling settings to auto-offer bookings." Approve button patches the assistant via `updateAssistantForNumber`.

Step gating updates: increase `totalSteps`, shift the existing `step === 6/7` branches by two, and re-point the AI-agent provisioning effect.

### 5. Vapi tab parity (`src/routes/_authenticated/vapi.tsx`)

- Add a Voice selector (same 4 voices) on the assistant edit panel so users can change it later.
- Show the new speaking-plan settings as read-only badges ("Lets caller finish speaking · short responses") so users see what's configured without exposing raw knobs.

## Out of scope

- No schema changes (uses existing `businesses.agent_voice_id`, `vapi_number_assistants.custom_*`, `scheduling_enabled`, `booking_url`).
- No new server functions — extend `ensureAssistantForNumber` and `updateAssistantForNumber`.
- No new dependencies.
- Booking provider plumbing already exists (`scheduling_enabled`, `booking_url`, `cal_url`, `calendly_url`); we only consume them in the prompt.

## Technical notes

- Vapi `startSpeakingPlan` / `stopSpeakingPlan` reference: setting higher `numWords` + `voiceSeconds` is the documented way to stop barge-in on filler words.
- Voice previews use ElevenLabs' public sample URLs; no API call, no credit cost.
- `applyTags` already substitutes `{business}` / `{book_consult}` — the new script just uses those tokens so per-business swap still works.
- The script step writes through `updateAssistantForNumber`, which already PATCHes Vapi + upserts the `vapi_number_assistants` row, so the AI-agent tab stays in sync.
