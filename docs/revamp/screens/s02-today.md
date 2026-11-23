# S02: Today

- **Routes:** web `apps/web/app/(coach)/page.tsx` (`/`); native: the Today tab root (route file placed by F6).
- **Owned paths:** `packages/app/src/features/home/**` and the two route files.
- **Depends on:** F6; F7.1 (queue and pulse, plus its prefetch helper, which S02 calls from its route file); F7.9 for intake-draft rows (blocked on O7; render them once F7.9 merges); F8 (first-run art).
- **Evidence:** critique 10, top-10 #1, §4, §5.2, §8 #1; `motion.md` §5.1; perf (Today LCP 3.5 s cold phone).

## Goal

Answer "who needs me today, and what do I do first?" Today is a work queue, not a dashboard (A6). Home and the actionable part of Alerts merge here.

## Layout

1. **Top line.** One sentence computed from the same source as the list: "5 check-ins overdue · 1 draft plan waiting to publish · 0 red flags."
2. **Filter chips** replace the stat cards: Overdue · Due today · Drafts · Needs review · Red flags. Each shows its count and scopes the list; the active chip is filled.
3. **Groups by urgency:**
   1. Red flags (REFER_REVIEW)
   2. Plans blocked (NEEDS_REVIEW)
   3. Overdue (sorted by days)
   4. Due today
   5. Drafts awaiting publish
   6. Intake drafts to resume ("Resume intake: Sara, step 3 of 5")
4. **Queue rows** (F5 queue row, 64 px desktop, 72 px phone):
   - Avatar, name, and a reason in words ("Check-in 109 days overdue · last weight 84.5 kg on 6 Aug").
   - Severity icon plus text.
   - A trailing primary action: **Start check-in**, **Review plan** or **Resume**.
   - Clicking the row opens the hub.
5. **Desktop right rail** (4 of 12 columns): "This week" (check-ins done 0/5 as a plain bar with numbers) and recent activity (plans published, clients added).
6. **Keyboard on web:** `J`/`K` move, `Enter` opens, `C` starts a check-in. `⌘K` comes from F6.
7. **Phone and native:**
   - Large title "Today", with the bell trailing (F6).
   - The chip row is pinned under the title and scrolls horizontally.
   - The queue fills the screen.
   - Pull to refresh, with no haptic.
8. **Batch.** "Start check-in" passes the remaining overdue and due ids (screens README, hand-offs).

## States

- Populated with the overdue-heavy demo data.
- All clear: only when the queue is truly empty, with "Next check-in due Thu 26 Nov".
- First run with 0 clients: F8 illustration, **Add your first client** and "See how targets are calculated".
- Loading skeleton, error with retry, offline.
- A filter chip with zero items.

## Motion and haptics

- When a check-in completes and the coach returns, its row collapses out (`base`) and the counts roll (`rolling-number`).
- First-load stagger of 30 ms × 5. Chip fill is `instant`.
- Reduced motion: block fade and an instant count swap with the highlight wash.
- No haptics except `select` on chips.

## Performance

Cold phone LCP 2.5 s or less (baseline 3.5 s); TBT 200 ms or less; no polling except the F7.1 pulse.

## Mock

Populated, all clear, first run, loading, error; light and dark; web 1440 and 390; iOS; Android.

## Done when

- The global conditions hold.
- Tests:
  - The top line and chip counts equal the list's items for every fixture.
  - Group order.
  - Row actions route correctly, including the `next` list.
  - The all-clear message never renders while items exist.
  - First-run and error states.
  - Keyboard shortcuts.
- Perf is recorded with the Q0 harness.
- The B1 regression is still covered (screens README rule).
