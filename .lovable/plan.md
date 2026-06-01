## Goal
Move AI agent provisioning into onboarding so every new user finishes onboarding with an assigned Vapi assistant. Keep all assistant customization (name, first message, system prompt, contractor preset) on the `AI agent` tab.

## Changes

### 1. `src/routes/onboarding.tsx` — add an "AI agent" step
- Insert a new step between **Carrier** and **Forwarding** titled **AI agent**.
- New `steps` array: `["Business", "Type", "Business phone", "Your cell", "Carrier", "AI agent", "Forwarding", "Test"]`.
- On entering the step, call `listVapiPhoneNumbers` + `listNumberAssistants`, then run `ensureAssistantForNumber` for each Vapi number that has no row yet, passing `contractorType: state.contractor_type` so the trade-aware default prompt is used.
- UI: spinner while provisioning, then a success card showing each number + "Assistant ready" + a one-line note that customization lives in the AI agent tab after onboarding. Continue button is disabled until at least one assistant is provisioned (or shows a graceful "We'll finish this on your first visit" fallback if no Vapi numbers are configured for the account, so users without a number aren't blocked).
- Update step gating (`step < 5` / `step === 5` branches) for the new indexes.

### 2. `src/routes/_authenticated/vapi.tsx` — remove the silent auto-provision
- Delete the `useEffect` that auto-calls `ensureAssistant` for missing numbers (lines ~120-135). Provisioning now belongs to onboarding.
- Keep the safety net: in the `Numbers & assistants` tab, if a number row is missing, show an inline "Provision assistant" button that calls `ensureAssistantForNumber` (covers numbers added later, or users who onboarded before this change).
- Tab order/labels unchanged; this remains the home of all customization.

## Out of scope
- No schema or server-function changes — `ensureAssistantForNumber` already exists and is idempotent.
- No changes to other tabs, settings, or login.
