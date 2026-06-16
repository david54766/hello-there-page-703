# CallRecover iOS Sync Prompt

Use this prompt in the Codex thread on the Mac/iOS machine after opening the CallRecover repository. The goal is to bring the SwiftUI iOS app back into parity with the current Android app and web backend without touching the separate Prima Donna project.

```text
You are working on the CallRecover native iOS app. The project is the CallRecover repo, not the Prima Donna repo.

Primary goal:
Bring the SwiftUI iOS app into parity with the current Android app and web backend. Use the Android app as the behavioral source of truth, especially:
- android/app/src/main/java/ai/easyfill/callrecover/data/Models.kt
- android/app/src/main/java/ai/easyfill/callrecover/data/CallRecoverApi.kt
- android/app/src/main/java/ai/easyfill/callrecover/MainActivity.kt

Do not add secrets to git. Do not commit Config/CallRecover.xcconfig or GoogleService-Info.plist. Keep the bundle id as ai.easyfill.callrecover unless I explicitly ask to change it.

Repo/project guardrails:
- Work only in the CallRecover iOS app under ios/.
- Do not use Prima Donna branding, pink theme, crown icon, or Prima Donna repo code.
- Keep the CallRecover black/white/gold contractor-focused theme and the current CallRecover phone icon.
- Keep iOS and Android behavior aligned; if you need to make a backend assumption, check the Android implementation first.

Sync these recent Android/web changes into iOS:

1. Business type and scripts
- Add business type "Other" to the iOS business type dropdown.
- Remove the old greeting/default hello path from iOS completely. Do not use default_hello_script, hello_script, or greeting templates.
- Script templates should use the current model: first_message and system_prompt/agent behavior only.
- Treat the system prompt as "Virtual Agent Behavior" in user-facing UI, not as a customer-facing script.
- Lock SMS consent text so users cannot edit it in iOS.

2. Business profile and setup
- Business type, carrier, and agent voice should be dropdowns, matching Android.
- Business profile updates should refresh or reselect scripts for the selected business type.
- Include "Other" as a generic option and show generic script copy if selected.
- Keep one assistant per business/Vapi number. Do not let the user switch between multiple assistants.

3. Leads and statuses
- Update the iOS lead model to include archived_at and archived_by.
- Fetch calls with: id,business_id,caller_number,caller_name,status,lead_status,urgency,priority,callback_requested,archived_at,archived_by,created_at,ai_summary,ai_summary_short,service_needed,transcript,recording_url
- Support these lead statuses:
  - active -> Active
  - requesting_call -> Requesting Call
  - in_progress -> In Progress
  - scheduled -> Scheduled
  - contacted -> Contacted
  - closed/resolved -> Resolved/Archived
- Active, requesting_call, in_progress, scheduled, and contacted are active/non-archived leads.
- Resolved/closed should archive the lead by setting archived_at through the same pattern Android uses. Archived leads must not disappear from revenue/recovered call totals.
- Add an Archived section with Restore. Restore clears archived_at and archived_by.
- "Mark contacted" and "Resolved" must visually update immediately and persist through the backend.
- The closed/resolved badge should be completion-colored, not green. Use a neutral dark/blue/gray completion treatment.

4. SMS handling
- Remove direct SMS reply/composer from iOS. Do not send customer texts from the system Twilio number from the app.
- SMS thread is read-only system history and should be collapsed by default.
- If the user needs to contact the customer, provide device actions such as Call and Message using the assigned agent/user phone, not the CallRecover system number.
- Keep approved system SMS only for status-update actions and server-side flows.
- The SMS thread should refresh when the lead is selected and when status changes occur.

5. Revenue/home dashboard
- Match Android's current home layout:
  - AI call recovery forwarding card at top.
  - Estimated recovered revenue card below.
  - "Estimated recovered revenue" title at the top of that card.
  - Recovered calls and revenue numbers should be smaller than before and fit cleanly.
  - Revenue bars should be solid gold, not black/gold gradients.
  - Date labels must not clip at the bottom on iPhone.
- Archived/resolved calls still count toward recovered calls and estimated recovered revenue.

6. Forwarding flow
- Forwarding should be a simple modal/sheet from the home page.
- Include carrier dropdown.
- Show one forwarding extension/code and one copy action.
- Include the carrier fee notice: carriers may charge additional fees or use plan minutes for call forwarding.
- Confirmation should be checkbox-style: "Forwarding is turned on".
- Save through /api/mobile/forwarding-status.

7. Booking and scheduling
- Add double-confirm before canceling appointments.
- Scheduling page should use popout/sheet flows for new appointments and blackout dates instead of always showing large forms inline.
- Add blackout support matching Android:
  - schedule_blackouts table with id,business_id,team_member_id,start_at,end_at,reason
  - allow whole-business blackout
  - allow agent-specific blackout
  - allow full-day or specific time-window blackout
- Holiday closures should be its own clean subsection under Appointments, not cluttered into the main booking card.
- Booking links/provider integrations that are not functional should display "Coming soon" and stay behind UI paths that can be wired later without a forced UI redesign.

8. Voice preview
- Voice selection should match Android options by name/description/sample:
  - Sarah: EXAVITQu4vr4xnSDxMaL
  - Lily: pFZP5JQG7iQjIQuC4Bku
  - Brian: nPczCjzI2devNBz1zQrb
  - Liam: TX3LPaxmHKxFdv7VOQHJ
- Use /api/mobile/voice-preview. Send the selected voiceId and that voice's sample text.
- If preview is playing and the user taps another voice, stop the old playback first.
- Button should toggle Play/Stop and clean up AVAudioPlayer on dismiss.
- Do not hardcode a single audio file or single voice for all preview buttons.

9. API parity
- Mirror Android CallRecoverApi endpoints and models:
  - sendPasswordReset: POST https://callrecover.net/api/public/password-reset
  - syncVapiAgent: POST /api/mobile/sync-vapi-agent
  - recentCalls includes archive fields
  - businessProfile excludes default_hello_script and includes sms_auto_response_mode, observed_holidays
  - updateBusiness excludes smsConsentText/defaultHelloScript, includes sms_auto_response_mode and observed_holidays
  - blackouts: GET/POST/DELETE /rest/v1/schedule_blackouts
  - updateCallLeadStatus should accept archive behavior
  - restoreCallArchive clears archived_at and archived_by
  - voicePreview uses /api/mobile/voice-preview
  - setupScan uses /api/mobile/setup-scan if onboarding/setup is present
- Push token platform must remain "ios".

10. Visual QA
- Keep layout polished and native SwiftUI, not a WebView.
- Verify on at least one small iPhone viewport and one large iPhone viewport.
- Check sign-in, home, leads detail, SMS thread collapsed state, booking, blackout/holiday sheets, team, more/setup, voice preview.
- Text must not clip, especially revenue chart date labels and action buttons.

11. Build/test commands on the Mac
- If needed, generate the Xcode project:
  xcodegen generate
- Open CallRecover.xcodeproj and build the CallRecover target.
- Run on simulator and physical device if available.
- Do not commit generated user-specific Xcode files.

12. Deliverables
- Commit iOS parity changes to the CallRecover repo.
- Mention any backend endpoints that iOS needed but were missing.
- Mention anything Android now needs if an iOS-only feature is discovered.
- Do not mark the work done until the iOS build succeeds or the exact blocking Xcode/backend error is recorded.
```

## Current Known iOS Drift Found From The Repo

- `ios/CallRecover/Services/CallRecoverAPI.swift` still selects and writes `default_hello_script`.
- `ios/CallRecover/Models/Models.swift` still has `defaultHelloScript` and `smsConsentText` as editable business fields.
- iOS calls do not currently fetch `archived_at` or `archived_by`.
- iOS still exposes `sendSMS(callId:body:)`; this should be removed from customer-facing UI and not used for direct replies.
- iOS lead actions currently use only `open` and `closed`; Android now uses `active`, `requesting_call`, `in_progress`, plus archive/restore.
- iOS does not yet have the Android `schedule_blackouts` model/API flow.
- iOS contractor types are missing `Other`.
- iOS assistant query is not limited to one account assistant in the same way Android is.

## Android Reference Files

- `android/app/src/main/java/ai/easyfill/callrecover/data/Models.kt`
- `android/app/src/main/java/ai/easyfill/callrecover/data/CallRecoverApi.kt`
- `android/app/src/main/java/ai/easyfill/callrecover/MainActivity.kt`

## Backend Reference Files

- `src/routes/api/mobile/voice-preview.ts`
- `src/routes/api/mobile/forwarding-status.ts`
- `src/routes/api/mobile/push-token.ts`
- `src/routes/api/mobile/setup-scan.ts`
- `src/routes/api/mobile/sync-vapi-agent.ts`
- `src/routes/api/public/password-reset.ts`

## Role-Based Team Member Mode To Mirror

Implement this in the same iOS app, not a separate app.

- Add support for user role `agent` in addition to `admin` and `staff`.
- On login, load viewer access from:
  - `business_members` by current `user_id`
  - `user_roles` by current `user_id` and accessible `business_id`
  - `team_members` by current `user_id`
- Pick role priority: `admin`, then `staff`, then `agent`.
- Admin/staff experience remains the normal full tenant app.
- Agent/team-member experience is restricted:
  - Tabs visible: Dashboard/Home, Leads, Booking/Scheduling, Team, Settings.
  - Team tab is read-only.
  - No AI Agent, Scripts, Revenue, Billing, Admin, account assistant editing, or tenant business-profile editing.
  - Dashboard shows only assigned recovered calls, response rate, open leads, and live activity.
  - Leads list should only show calls assigned to that team member through `lead_assignments`.
  - Agents can update their assigned lead status/contact/resolved state only.
  - Agents can create appointments for themselves/assigned leads and create their own blackout windows.
  - Agents cannot create whole-business blackout dates or change booking availability globally.
- If an agent is not linked to a `team_members.user_id`, show a clean locked/settings message explaining that the tenant admin needs to link their team member account.
- Keep customer direct SMS reply disabled; use status-update actions only.
- Use the Android files as the behavioral reference:
  - `android/app/src/main/java/ai/easyfill/callrecover/data/Models.kt`
  - `android/app/src/main/java/ai/easyfill/callrecover/data/CallRecoverApi.kt`
  - `android/app/src/main/java/ai/easyfill/callrecover/MainActivity.kt`
