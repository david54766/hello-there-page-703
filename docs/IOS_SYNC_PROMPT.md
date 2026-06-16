# iOS Sync Prompt - Latest Role-Based Team Member Mode Only

Paste the prompt below into the iOS build thread. The previous iOS parity prompt has already been run, so this only covers the newest role-based team member access work.

```text
You are updating the existing native iOS CallRecover app. The previous iOS parity prompt has already been completed, so only apply the latest role-based team-member mode changes from the current CallRecover web/Android repo.

Do not rework the prior parity items unless they directly conflict with role-based access. In particular, do not redo older work for visual theme, voice previews, archived calls, holiday closures, password reveal, lead statuses, read-only SMS threads, or native-app-coming-soon homepage content.

Goal:
Implement role-based mode in the same iOS app, not a separate app.

Backend/Supabase already live:
- app_role now includes agent.
- team_member_invites exists.
- team_members has user_id.
- RLS now allows:
  - admin/staff operators to manage tenant data.
  - agent/team-member users to read assigned calls, related SMS thread/messages, assigned appointments, team list read-only, and own blackout windows.
  - agents cannot access assistant, scripts, billing, revenue, or admin data.
- Anonymous RPC execution is revoked for new access helper functions.

iOS requirements:

1. Load viewer access after login:
   - Fetch business memberships from business_members by auth user id.
   - Fetch user_roles for those businesses.
   - Fetch the linked team_members row where user_id == current auth user id.
   - Role priority: admin, staff, agent.
   - Build a ViewerProfile or ViewerAccess model with:
     - businessId
     - role
     - isAgent
     - canManageTenant
     - teamMemberId
     - teamMember

2. Navigation by role:
   - Admin/staff: keep the existing full app.
   - Agent: show only Home/Dashboard, Leads, Booking/Scheduling, Team, and Settings.
   - Hide AI Agent, Scripts, Billing, Revenue, Admin, account assistant management, and business setup editing for agent users.

3. Agent dashboard:
   - Show assigned recovered calls.
   - Show response rate.
   - Show open leads.
   - Show live activity for that linked team member only.
   - Do not show revenue metrics or tenant-wide management controls.

4. Leads:
   - Agents see only calls assigned through lead_assignments to their linked team_member.
   - Agents may update allowed status/contact/resolved/archive workflow fields for assigned leads only.
   - Keep direct customer SMS replies disabled. Customer texting should remain limited to approved status-update actions only.

5. Team:
   - Agent team tab is read-only.
   - Show current assigned team members.
   - Hide add/edit/delete/invite controls for agents.

6. Scheduling:
   - Agents can create appointments only for themselves or assigned leads.
   - Agents can create/edit/delete their own blackout time windows.
   - Agents cannot create whole-business blackout dates or change global booking availability.
   - If no linked team member exists, show a locked message telling the tenant admin to link the team member account.

7. Settings:
   - Agent settings should show account access info:
     - role/team-member badge
     - business name
     - signed-in email
     - linked member name
     - support email
     - support phone
   - Hide tenant profile, AI agent, scripts, billing, revenue, SMS compliance, and assistant controls for agents.

8. Invite acceptance:
   - Support opening /accept-team-invite?token=... links if routed through the web.
   - At minimum, ensure users can accept on web, sign in on iOS, and then iOS recognizes the agent role.
   - If you add native deep-link handling, map invite acceptance to the same backend behavior as web.

Reference files in the current CallRecover repo:
- Web viewer access: src/lib/viewer-access.ts
- Web invite flow: src/lib/team-invites.functions.ts and src/routes/accept-team-invite.tsx
- Web route gating: src/routes/_authenticated.tsx
- Web agent screens:
  - src/routes/_authenticated/dashboard.tsx
  - src/routes/_authenticated/team.tsx
  - src/routes/_authenticated/scheduling.tsx
  - src/routes/_authenticated/settings.tsx
- Android role implementation:
  - android/app/src/main/java/ai/easyfill/callrecover/data/Models.kt
  - android/app/src/main/java/ai/easyfill/callrecover/data/CallRecoverApi.kt
  - android/app/src/main/java/ai/easyfill/callrecover/MainActivity.kt
- Supabase migrations:
  - supabase/migrations/20260616130000_add_agent_role.sql
  - supabase/migrations/20260616130500_team_agent_access.sql
  - supabase/migrations/20260616132000_restrict_agent_access_helper_rpc.sql

Acceptance checks:
- Admin/staff login still sees the full app.
- Agent login sees only limited tabs.
- Agent cannot reach AI/scripts/billing/revenue/admin screens by navigation or stale state.
- Agent sees only assigned calls and can update allowed lead workflow actions.
- Agent can add their own blackout window and create their own appointments.
- Agent team screen is read-only.
- Build succeeds in Xcode.
- No older parity work is re-applied.
```
