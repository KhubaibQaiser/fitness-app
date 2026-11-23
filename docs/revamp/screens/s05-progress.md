# S05: Progress (Journey and History merged)

- **Routes:** web `apps/web/app/(coach)/clients/[clientId]/progress/page.tsx` (created by F10; `journey` and `history` redirect here); the native equivalent.
- **Owned paths:**
  - `packages/app/src/features/client-journey/**`.
  - `packages/app/src/features/client-detail/client-hub-journey.tsx` and `client-hub-history.tsx` (merged, then deleted).
  - The Progress route files, once F10 has created them (the `journey` and `history` redirects stay F10's).
- **Depends on:** F10; F9 (chart, WeaveLine); F7.3 (prefetch helper, called from the route file); F7.4 (progress series).
- **Evidence:** critique 21–22, bug 4, N2; A7, A20; `motion.md` §5.3 and §5.15.

## Goal

The story of the goal: start, every check-in with its weight, where the client is today, and the projected path to the target date. History and Journey showed the same events, so they merge (A7).

## Layout

1. **Desktop:**
   - The F9 weight chart across the top, with check-in markers.
   - Below it, a compact timeline on the same time axis. Hovering or focusing a row highlights its chart point, and the reverse.
2. **Rows** (56 px): date · weight · change · adherence in words · verdict chip. A row expands for notes and actions (View check-in).
3. **Order:**
   - Chronological.
   - "Today" is a thin labelled rule in its true position, with an overdue check-in just before it, carrying **Start check-in**.
   - The projection follows in a lighter dashed treatment, ending at the target date.
4. **List or Table** toggle on desktop. The dense table has date, weight, change, adherence, verdict, action taken, a notes icon and a chevron.
5. **Filter:** check-ins only (default), or all events (vitals entries, plan publishes).
6. **WeaveLine** as the tab's signature (A20), per `motion.md` §5.15.
7. **Phone and native:** the chart at 180 px, then rows. No table toggle on phone.

## Fixes

- Every row shows weight.
- Words, not enums.
- Dates come from F7.4 and the F2 formatters, with no one-day shift (bug 4).
- The path wording names the expected weight correctly ("Behind the expected 82.1 kg for this week", not the goal weight).
- The tab content is full width, like the other tabs.

## States

Rich (8+ check-ins); one check-in; no check-ins (with the projection and "Log the first check-in"); overdue; loading; error.

## Motion

Weave draw-in; linked chart and row highlight; expanding rows use layout transitions. Reduced motion shows final states.

## Performance

No long task over 200 ms with a year of weekly check-ins (52) at 4× CPU.

## Mock

Rich, one check-in, none, overdue; light and dark; web 1440 and 390; iOS.

## Done when

- The global conditions hold.
- Tests:
  - Chronological order, including the Today rule and the overdue item.
  - Date-only values render the same under `TZ=Asia/Karachi` and `TZ=UTC`.
  - Rows show weight and change.
  - The filter.
  - The table toggle.
  - The old Journey and History URLs land here (F10's redirect tests still pass).
- Perf is recorded.
