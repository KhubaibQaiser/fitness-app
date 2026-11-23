# Performance baseline (measured 2026-11-23)

Snapshot of the performance report ([artifact](https://claude.ai/artifact/XdpFBdPKfKyxdZjQMQchkR), owner-only). Q2 fills in the "After" columns on the release candidate. Budgets are in [README §9](../README.md#9-performance-budgets-from-the-baseline).

## Environment and limits

- **Machine and tools:** a MacBook (Apple Silicon), headless Chrome, Playwright 1.62, Lighthouse 12.8.2.
- **Build:** the production web build (Next 16.4.3, Turbopack, standalone server); the API in production mode; Postgres 17 in Docker on the same machine.
- **Synthetic data**, in a separate local database: 170 clients, 2,204 weigh-ins, 41 plans of about 76 items each.
- **Limits:**
  - All runs are local, and Lighthouse throttling is simulated.
  - Numbers vary between runs. The roster's signed-in first paint measured 0.4–3.0 s across two runs.
  - Hub, journey and plan-editor Lighthouse runs were invalid: they showed "Could not load" because Lighthouse's fixed Cookie header fights token refresh. Signed-in measurements replace them.
  - API times are server-only, with no network. The round trip from Pakistan to the hosted region was not measured.
  - There are no real-device numbers for any platform yet.

## Cold loads (Lighthouse, mobile: 4× CPU, slow 4G)

| Route    | Perf | FCP   | LCP   | TBT    | Weight   | DOM   | After |
| -------- | ---- | ----- | ----- | ------ | -------- | ----- | ----- |
| login    | 75   | 1.8 s | 7.1 s | 122 ms | 1,457 KB | 57    |       |
| home     | 87   | 2.1 s | 3.5 s | 152 ms | 1,079 KB | 796   |       |
| clients  | 63   | 3.1 s | 4.6 s | 590 ms | 1,084 KB | 5,767 |       |
| check-in | 81   | 2.1 s | 4.5 s | 122 ms | 1,040 KB | 103   |       |
| intake   | 88   | 2.0 s | 3.5 s | 110 ms | 1,077 KB | 116   |       |

- CLS was 0.00 on every valid run.
- Desktop scored 96–99.
- On every valid phone run the LCP element is text, and most of its time is render delay: on login, 6.6 s of the 7.1 s.

## Signed-in loads (390 px, 4× CPU, 150 ms / 1.6 Mbps)

| Route       | FCP    | LCP    | TBT    | Long tasks | Longest | DOM   | API calls after load | After |
| ----------- | ------ | ------ | ------ | ---------- | ------- | ----- | -------------------- | ----- |
| home        | 340 ms | 340 ms | 51 ms  | 2          | 98 ms   | 830   | 0                    |       |
| roster      | 3.0 s  | 3.0 s  | 1.4 s  | 8          | 972 ms  | 5,795 | 0                    |       |
| hub         | 1.1 s  | 2.7 s  | 387 ms | 3          | 281 ms  | 320   | 4                    |       |
| journey     | 472 ms | 1.2 s  | 87 ms  | 3          | 104 ms  | 245   | 4                    |       |
| history     | 328 ms | 904 ms | 20 ms  | 2          | 64 ms   | 186   | 3                    |       |
| plan tab    | 340 ms | 920 ms | 19 ms  | 2          | 68 ms   | 238   | 3                    |       |
| plan editor | 328 ms | 328 ms | 67 ms  | 1          | 117 ms  | 434   | 2                    |       |
| check-in    | 324 ms | 340 ms | 0 ms   | 0          | 0 ms    | 137   | 0                    |       |
| vitals      | 340 ms | 340 ms | 0 ms   | 0          | 0 ms    | 207   | 1                    |       |
| intake      | 328 ms | 336 ms | 7 ms   | 1          | 57 ms   | 151   | 1                    |       |
| tools       | 336 ms | 336 ms | 3 ms   | 1          | 53 ms   | 287   | 1                    |       |

Client-side navigation from the roster to a hub took 466 ms, with long tasks of 99 and 59 ms.

## Hotspots (CPU profiles mapped to source)

| Where  | Cost                                             | Cause                                                                                                         | Owner     |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------- |
| Roster | `@tamagui/web` 628 ms of about 1.15 s of script  | Runtime style resolution per element: `getSplitStyles`, `getCSSStylesAtomic`, `propMapper`, `insertStyleRule` | F5, S03   |
| Roster | 534 ms longest cold task; 1.4 s signed-in TBT    | About 5,800 nodes rendered at once                                                                            | F7.2, S03 |
| Hub    | `formatChartDate` 200 ms                         | A new `Intl.DateTimeFormat` per call (`weight-chart.tsx:70`)                                                  | F9        |
| Hub    | `getBoundingClientRect` 61 ms                    | Forced layout during render                                                                                   | F9        |
| Hub    | API waterfall at 1.9 s, `config/public` at 2.7 s | Fetching after hydration                                                                                      | F7.3      |

## Bundles

**Web: 1.5 MB uncompressed JavaScript.**

| Package                     | Size   | Owner |
| --------------------------- | ------ | ----- |
| next (framework, React DOM) | 422 KB | —     |
| react-native-web            | 184 KB | —     |
| libphonenumber-js           | 148 KB | F2    |
| GymOS app code              | 100 KB | —     |
| @tamagui/themes             | 75 KB  | F1    |
| @tamagui/web                | 75 KB  | —     |
| dayjs                       | 73 KB  | F5    |
| GymOS UI kit                | 59 KB  | —     |
| react-native-ui-datepicker  | 46 KB  | F5    |
| @tanstack/query-core        | 43 KB  | —     |
| tailwind-merge              | 26 KB  | F5    |
| lodash                      | 14 KB  | F5    |

Images: `icon.png` (512×512, 385 KB) loads on every page; `hero.jpg` is 435 KB. Owner: F8.

**iOS: 6.5 MB JavaScript, 7.0 MB Hermes bytecode.** The SDK 58 spike produced 9.3 MB.

| Package                    | Size     | Owner                  |
| -------------------------- | -------- | ---------------------- |
| @tamagui/lucide-icons-2    | 1,229 KB | U4                     |
| react-native-reanimated    | 729 KB   | —                      |
| react-native               | 561 KB   | —                      |
| expo-router                | 458 KB   | —                      |
| @shopify/react-native-skia | 257 KB   | Q5, if unused after F9 |
| GymOS app code             | 234 KB   | —                      |
| libphonenumber-js          | 210 KB   | F2                     |
| @tamagui/web               | 142 KB   | —                      |
| dayjs                      | 98 KB    | F5                     |
| @tamagui/themes            | 95 KB    | F1                     |
| expo-skia-charts           | 74 KB    | Q5                     |
| lodash                     | 71 KB    | F5                     |

## API (server time, local database, 30 sequential requests after warm-up)

| Endpoint         | p50    | p95     | Size    |
| ---------------- | ------ | ------- | ------- |
| me               | 1.5 ms | 2.1 ms  | 0.3 KB  |
| roster           | 4.3 ms | 5.2 ms  | 39.4 KB |
| due check-ins    | 2.1 ms | 2.7 ms  | 11.3 KB |
| unread count     | 1.7 ms | 2.0 ms  | 0.0 KB  |
| client detail    | 3.1 ms | 4.8 ms  | 1.3 KB  |
| client vitals    | 2.1 ms | 2.8 ms  | 8.3 KB  |
| meal plan detail | 2.6 ms | 3.6 ms  | 30.5 KB |
| diet-plan PDF    | 8.3 ms | 10.5 ms | 2.5 KB  |
| food search      | 2.2 ms | 2.9 ms  | 2.1 KB  |

- **Under load (20 parallel), p50 / p95:**
  - roster: 24.5 ms / 32 ms
  - due check-ins: 17.7 ms / 29.3 ms
  - unread count: 14 ms / 15.5 ms
- **Plan generation:** 12.9 ms p50, 19.8 ms p95 over 30 plans.
- **Solver failures:** 2 of about 39 generations failed as "solver infeasible" on synthetic clients. That is a product follow-up, not a speed issue.
- **Roster size:** the response is 40 KB at 170 clients and grows linearly, because it isn't paginated (F7.2).

## Native

- **iOS:**
  - Measured: bundle composition only.
  - Not measured: launch time, Instruments time profiles and memory. A Release build needs about 4 GB of build output, more than the disk had free. Q4 measures them on a real iPhone.
- **Android:** not run. The kit ([`scripts/perf/android/`](../../../scripts/perf/android/README.md)) automates:
  - cold start ×10;
  - roster scroll jank;
  - memory;
  - a Perfetto trace;
  - a screen recording and screenshots.

  The owner runs it on the other MacBook.

## Reproduce

The scripts are in [`scripts/perf/`](../../../scripts/perf/README.md), whose README has the steps from a clean checkout. Run them against the production web build and an API on a synthetic database:

- **Synthetic data:** `seed-synthetic.mjs 170` (and `500` for the roster budget), each into its own local database. 170 reproduces the data above: 41 plans, with 2 more failing as "solver infeasible".
- **Cold loads:** `lighthouse.mjs`, Lighthouse 12.8.2 (pinned in the root `package.json`), signing in fresh before each run. Hub, journey and plan editor are left out: under Lighthouse's fixed Cookie header the app's token refresh trips reuse detection and those pages show "Could not load" (the same limit as above, checked again on 2026-11-24). `vitals-flow.mjs` measures them signed in.
- **Signed-in loads:** `vitals-flow.mjs`, with a CPU profile and a filmstrip per route.
- **Hotspots:** `attribute-cpu.mjs` on those profiles, against a build with browser source maps.
- **API:** `api-bench.mjs`.
- **Spread:** each scenario 5 times on `main` on a quiet machine, then `summarize.mjs` for the median and min–max. Later budget checks compare medians from the same scripts, data and settings.

### Five runs on `main` (2026-11-24)

Each scenario ran 5 times in a row; cells are **median (min–max)**. Later budget checks compare their medians with these.

- **Code:** `main` at de46b0c, merged into the Q0 branch (scripts only, no app change). Production web build, standalone server; API without watch mode (`AI_MODE=fallback`); Postgres 17 in Docker.
- **Data:** `seed-synthetic.mjs 170` (171 clients with the seed's demo client), and `500` for the last table.
- **Machine:** the same MacBook, with other builders' work paused. One-minute load average from `uptime`, logged after every run: 3.1–4.0 during Lighthouse (02:24–02:34), 2.5–6.4 during the signed-in flow (02:34–02:41; 6.4 once, after run 4), 4.5–4.7 during the API runs, 3.6–4.4 for the 500-client roster (02:42–02:43).
- **Spread to expect:** on Lighthouse mobile, every route except the roster had one run (intake two) about 1.2–1.3 s slower on LCP, a different run each time; the roster's LCP was 7.1 s in four runs and 3.4 s in one. In the signed-in flow, one hub run had a single 823 ms task. Compare medians, not single runs.

**Cold loads (Lighthouse 12.8.2; mobile 4× CPU, slow 4G).** CLS was 0 on every run.

| Run             | Perf         | FCP (ms)            | LCP (ms)            | TBT (ms)      | Weight (KB)         | DOM                 |
| --------------- | ------------ | ------------------- | ------------------- | ------------- | ------------------- | ------------------- |
| login-mobile    | 91 (82–92)   | 1,956 (1,811–1,959) | 3,207 (3,127–4,526) | 63 (55–76)    | 1,464 (1,459–1,464) | 66 (66–66)          |
| home-mobile     | 87 (79–88)   | 2,256 (2,254–2,257) | 3,517 (3,506–4,719) | 122 (105–131) | 1,083 (1,081–1,083) | 796 (796–796)       |
| clients-mobile  | 63 (62–78)   | 2,105 (2,104–2,106) | 7,054 (3,367–7,054) | 462 (449–476) | 1,088 (1,086–1,088) | 5,795 (5,795–5,800) |
| checkin-mobile  | 88 (80–89)   | 2,106 (2,105–2,109) | 3,366 (3,355–4,664) | 148 (121–150) | 1,040 (1,040–1,040) | 103 (103–103)       |
| intake-mobile   | 88 (80–88)   | 1,956 (1,955–1,961) | 3,515 (3,506–4,830) | 132 (130–145) | 1,077 (1,077–1,077) | 116 (116–116)       |
| home-desktop    | 100 (99–100) | 525 (524–526)       | 739 (738–945)       | 0 (0–0)       | 1,110 (1,110–1,110) | 796 (796–796)       |
| clients-desktop | 96 (96–96)   | 524 (524–525)       | 1,323 (1,323–1,323) | 60 (58–65)    | 1,128 (1,128–1,128) | 5,795 (5,795–5,795) |

**Signed-in loads (390 px, 4× CPU, 150 ms / 1.6 Mbps).** The last row is the client-side tap from the roster to a hub.

| Route                      | FCP (ms)      | LCP (ms)            | TBT (ms)      | Long tasks | Longest (ms)  | DOM                 | API calls after load | Time (ms)     |
| -------------------------- | ------------- | ------------------- | ------------- | ---------- | ------------- | ------------------- | -------------------- | ------------- |
| home                       | 356 (328–364) | 360 (344–368)       | 28 (27–32)    | 1 (1–1)    | 78 (77–82)    | 831 (831–831)       | 0 (0–0)              | —             |
| roster                     | 344 (340–412) | 344 (340–412)       | 672 (621–686) | 5 (5–5)    | 439 (428–469) | 5,829 (5,829–5,829) | 0 (0–0)              | —             |
| hub                        | 352 (340–364) | 1,288 (1,280–2,104) | 105 (99–805)  | 2 (2–2)    | 124 (121–823) | 307 (307–307)       | 4 (4–4)              | —             |
| journey                    | 344 (336–368) | 912 (900–1,192)     | 21 (13–85)    | 2 (2–3)    | 66 (58–109)   | 322 (322–322)       | 4 (4–4)              | —             |
| history                    | 336 (332–352) | 860 (856–868)       | 6 (5–10)      | 1 (1–1)    | 56 (55–60)    | 188 (188–188)       | 3 (3–3)              | —             |
| plan-tab                   | 344 (336–348) | 884 (880–908)       | 14 (11–16)    | 1 (1–1)    | 64 (61–66)    | 240 (240–240)       | 3 (3–3)              | —             |
| plan-editor                | 340 (332–344) | 340 (336–348)       | 39 (31–42)    | 1 (1–1)    | 89 (81–92)    | 375 (375–375)       | 2 (2–2)              | —             |
| check-in                   | 336 (336–356) | 336 (336–356)       | 0 (0–19)      | 0 (0–1)    | 0 (0–69)      | 138 (138–138)       | 0 (0–0)              | —             |
| vitals                     | 328 (320–340) | 328 (320–340)       | 0 (0–0)       | 0 (0–0)    | 0 (0–0)       | 208 (208–208)       | 1 (1–1)              | —             |
| intake                     | 340 (336–348) | 340 (336–348)       | 5 (0–24)      | 1 (0–2)    | 55 (0–64)     | 152 (152–152)       | 1 (1–1)              | —             |
| tools                      | 360 (356–364) | 360 (356–364)       | 10 (0–16)     | 1 (0–2)    | 60 (0–62)     | 288 (288–288)       | 1 (1–1)              | —             |
| roster → hub (client-side) | —             | —                   | —             | 2 (2–2)    | 118 (99–120)  | —                   | —                    | 527 (493–554) |

**API (server time, 30 sequential requests after warm-up; ×20 rows are 20 parallel × 5 rounds).**

| Endpoint          | p50 (ms)         | p95 (ms)         | Size (KB)        |
| ----------------- | ---------------- | ---------------- | ---------------- |
| me                | 2.1 (2–2.2)      | 2.9 (2.2–3.7)    | 0.3 (0.3–0.3)    |
| roster            | 4.6 (4.6–4.9)    | 5.2 (5–5.4)      | 39.7 (39.7–39.7) |
| due check-ins     | 2.9 (2.7–3.2)    | 3.3 (2.8–5)      | 11.3 (11.3–11.3) |
| unread count      | 2.3 (2.2–2.4)    | 2.4 (2.4–3.2)    | 0 (0–0)          |
| notifications     | 2.3 (2.3–2.3)    | 2.5 (2.3–4)      | 0 (0–0)          |
| client detail     | 3.4 (3.3–3.8)    | 3.7 (3.6–6.6)    | 1.4 (1.4–1.4)    |
| client vitals     | 2.5 (2.4–2.8)    | 2.9 (2.6–3.7)    | 6.6 (6.6–6.6)    |
| client check-ins  | 2.4 (2.3–2.8)    | 2.7 (2.6–4.8)    | 0.3 (0.3–0.3)    |
| meal plans list   | 2.2 (2.2–2.4)    | 2.4 (2.4–3.5)    | 0.5 (0.5–0.5)    |
| meal plan detail  | 3.1 (3–3.3)      | 4.3 (3.2–5.4)    | 30.6 (30.6–30.6) |
| diet-plan PDF     | 8.5 (8.4–8.6)    | 10 (9.4–11.1)    | 2.5 (2.5–2.5)    |
| food search       | 2.7 (2.6–3)      | 3.5 (3–4.3)      | 2.1 (2.1–2.1)    |
| roster x20        | 26.7 (26.4–27.9) | 35.5 (34.2–42.3) | —                |
| due check-ins x20 | 19.5 (19.3–20.1) | 25.2 (21.9–26.6) | —                |
| unread count x20  | 15.6 (14.8–16.5) | 17.5 (16.2–18.4) | —                |

**Roster at 500 clients (signed in, same profile).** The API returns at most 200 clients (`listClients` defaults to `limit 200`, `packages/modules/src/coaching/clients.ts`), so the page renders 200 rows: the "500 clients" budget row in README §9 measures a capped roster until F7.2 adds pagination.

| Route                      | FCP (ms)      | LCP (ms)      | TBT (ms)      | Long tasks | Longest (ms)  | DOM                 | API calls after load | Time (ms)           |
| -------------------------- | ------------- | ------------- | ------------- | ---------- | ------------- | ------------------- | -------------------- | ------------------- |
| roster                     | 352 (332–392) | 352 (332–392) | 763 (751–816) | 5 (5–6)    | 497 (494–503) | 6,786 (6,786–6,786) | 0 (0–0)              | —                   |
| roster → hub (client-side) | —             | —             | —             | 2 (2–2)    | 144 (136–148) | —                   | —                    | 1,025 (1,005–1,042) |

**Hotspots, one source-mapped run (02:44, 170 clients).** `@tamagui/web` took 579 ms of the roster's script (628 ms on 2026-11-23); on the hub, `weight-chart.tsx:70` (`formatChartDate`) took 74 ms and `getBoundingClientRect` 63 ms. One run only, so read these as the same hotspots, not new numbers.
