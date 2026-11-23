# S12: Inbox and 404

- **Routes:**
  - Web `apps/web/app/(coach)/notifications/page.tsx` (URL stays; named Inbox) and `apps/web/app/not-found.tsx`.
  - Native `notifications` (pushed from the Today bell) and `apps/mobile/app/+not-found.tsx`.
- **Owned paths:** `packages/app/src/features/notifications/**`, `packages/app/src/features/not-found/**` and those route files.
- **Depends on:** F6; F7.1 (actionable items, pulse); F8 (the Inbox clear and 404 illustration slots).
- **Evidence:** critique 26 and 99, bug 18, N5; A6.

## Inbox

1. **One name everywhere: Inbox.** It is reached from the bell (F6), not a primary tab.
2. **Contents:**
   - Things to act on: check-ins overdue or due, red flags, blocked plans, drafts awaiting publish.
   - Coach-initiated events (published, created) don't appear here. They go to Today's recent activity.
3. **Groups:** Today / This week / Earlier.
4. **Rows:**
   - A sentence with the client's name ("Adnan's check-in is 109 days overdue").
   - Relative time ("2 h ago"), with the absolute time in the tooltip and the accessible label (F2 formatters; B6 fixed the parse).
   - An unread dot.
   - An inline action: **Start check-in** or **Review plan**.
5. **Filters:** Needs action · All. "Mark all read". Swipe to mark read on native.

## 404

1. Keep the copy ("This screen isn't on the roster"), **Back to Today** and **View clients**.
2. Use the F8 404 illustration in place of the heavy ring, and drop the "OFF THE FLOOR" eyebrow.
3. When signed in, it renders inside the shell, so the coach keeps navigation. When signed out, it renders in the public layout.

## States

- **Inbox:** populated, Inbox clear (F8 illustration), loading, error with retry, all read.
- **404:** signed in, signed out.

## Mock

Inbox desktop, phone and iOS; 404 in the shell and public; light and dark.

## Done when

- The global conditions hold.
- Tests:
  - Grouping by day.
  - Each row's action routes correctly.
  - Mark read and mark all read.
  - Coach-initiated events are excluded.
  - 404 inside the shell when signed in, and public when signed out.
- The B6 regression is still covered (screens README rule).
- Inbox: cold phone LCP 2.5 s or less, and no polling except the F7.1 pulse (perf recorded with the Q0 harness).
