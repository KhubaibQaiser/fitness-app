# S03: Clients roster

- **Routes:** web `apps/web/app/(coach)/clients/page.tsx`; native: the Clients tab root (placed by F6).
- **Owned paths:** `packages/app/src/features/roster/**` and the two route files.
- **Depends on:** F6; F7.2 (roster v2, plus its prefetch helper, which S03 calls from its route file).
- **Install (if chosen):** `@shopify/flash-list` for native recycling. The builder decides between it and a tuned `FlatList` by measurement, recorded in the PR.
- **Evidence:** critique 11, bugs 1, 12 and 14, N13; perf (5,795 DOM nodes, 590 ms cold TBT, 1.4 s signed-in TBT; longest task 534 ms cold and 972 ms signed-in at 170 clients).

## Goal

Find a client and scan caseload health with the loop's columns, at any roster size.

## Layout

1. **Desktop table** (F5 data table, virtualised, with keyset pages from F7.2):

   | Column        | Content                                                                           |
   | ------------- | --------------------------------------------------------------------------------- |
   | Client        | Name, with the goal tag on a second line                                          |
   | Status        | One reason in words plus an icon ("Overdue 109 d", "Red flag", "New", "On track") |
   | Last check-in | "6 Aug · 109 d ago"                                                               |
   | Next due      | Date                                                                              |
   | Weight        | Current, in the coach's unit, plus change since start ("−3.5 kg")                 |
   | Plan          | "Published v1", "Draft v2", "Needs review" or "None"                              |
   | Adherence     | Last value, in words                                                              |
   - Sticky header; sortable through the server with `aria-sort`.
   - Row hover reveals quick actions (Check-in, Log vitals). The whole row is a link.
   - Goal appears once. The "Progress" placeholder column is removed (bug 14).

2. **Search** with an icon, a visible label for screen readers, and the `/` shortcut. Filter chips include Overdue, with server counts.
3. **Phone web:** 72 px rows (avatar, name, a status line in words, chevron), with search pinned. "New client" is a header button.
4. **Native:** large title "Clients" with a search bar. "New client" is the trailing nav-bar button on iOS and a FAB on Android. Recycled list; rounded search and filter controls (N13).
5. **Same data on every breakpoint.** The desktop shows CHECKIN_OVERDUE as the phone does (bug 12).

## States

Populated; loading; loading the next page; end of list; no clients (first-run illustration, **New client**); "No matches for 'xy'" with clear search; error with retry.

## Performance

- DOM of 1,200 nodes or fewer at any roster size.
- Longest task 200 ms or less at 500 clients (signed-in, 4× CPU).
- Cold phone LCP 2.5 s or less.
- Android janky frames 5% or fewer while scrolling (Q4).

## Mock

Desktop table and phone list; populated (170 synthetic clients), no matches, empty, loading; light and dark; iOS and Android.

## Done when

- The global conditions hold.
- Tests:
  - Pagination and cursor handling.
  - Debounced search.
  - Sort with `aria-sort`.
  - Status words per enum.
  - The same status shown on phone and desktop.
  - Quick actions route correctly.
- The budget is measured with the Q0 harness at 170 and 500 clients and recorded in the PR.
