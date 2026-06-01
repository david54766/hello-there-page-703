## Goal
Condense the long Settings page into a tabbed layout so users can jump between groups instead of scrolling.

## Tab structure
Using the existing shadcn `Tabs` component, group the current cards as:

1. **Business** — Business info, Tag values
2. **Notifications** — Notifications, AI replies
3. **Scheduling** — Scheduling provider, Scheduling toggles, Observed holidays
4. **Voice & SMS** — Voice agent, SMS compliance, Campaign registration
5. **Security** — Two-factor authentication

The Save button stays pinned at the top (or bottom) of the page so it persists across tabs, since all fields write to the same `biz` state.

## Changes
- Edit only `src/routes/_authenticated/settings.tsx`.
- Wrap existing card JSX in `<Tabs defaultValue="business">` with a `TabsList` and one `TabsContent` per group above. No card content, state, or save logic changes — purely a presentational reorganization.
- Keep the page heading and the single Save action visible regardless of active tab.

## Out of scope
No changes to data, server functions, or other routes.
