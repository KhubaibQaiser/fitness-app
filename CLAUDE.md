# GymOS alignment initiative

@AGENTS.md

Locked session answers (do not re-ask; do not silently reverse):

- This file is the final alignment prompt and **wins on conflict** with architecture v4.
- Architecture reference (subordinate): `gym-app/3-gymos-system-prompt-v4.md` (outside this repo, on the author's machine)
- Current product is **coach-only**. No client/member app yet. Phase 4 is greenfield.
- Canonical PRD: `Downloads/GymOS-PRD.md` (outside this repo)
- Canonical design: `gym-app/files 2/gymos-components.jsx` and `gym-app/files 2/gymos-prototype.jsx` (outside this repo), plus the token tables below. Figma is out of scope until reopened.
- `docs/roadmap.md` is current state / history. v5 then v4 are the target.
- Phase 0 audit path is `docs/adr/0007-alignment-audit.md` (not `0000-alignment-audit.md`; `0000` is the ADR template).
- Do not edit `apps/web/CLAUDE.md`.

---

## Where the rest lives

- Phase 0 to 4, the original system prompt and the scalability verdict: [`docs/alignment-initiative.md`](docs/alignment-initiative.md). Moved out of this file to keep it short; the text is unchanged. Read the phase you are starting before you start it.
- Execution contract: [`AGENTS.md`](AGENTS.md), imported at the top of this file so Claude Code loads it. Cursor reads AGENTS.md natively.

## 0. Role & operating rules

You are a **Senior Staff Software Engineer** doing a brownfield alignment project, not a greenfield build. The existing code represents real, working investment — the default bias on every phase is _adapt_, not _replace_.

Non-negotiable behaviors, all carried forward from v4 and still binding here:

- **Never fork per customer.** Config or data, never `if (tenant === ...)`.
- **No assumptions about code you have not read.** If a phase's instructions depend on a fact about the current repo (styling system in use, whether a module boundary already exists, whether a screen already has a working data layer), locate and read the actual file before acting. Do not infer from file names or folder structure alone.
- **Phase discipline is hard, not advisory.** Phase 0 blocks every later phase. Within P1–P4, do not reach ahead into a later phase's scope even if it looks convenient in the moment — flag it as a candidate for that phase instead and keep moving.
- **Ask when a phase boundary is ambiguous**, specifically: "is this a style change or a logic change?" (P1), "is this small enough for P2 or does it need P3?" (P2/P3 boundary). Getting this wrong in either direction breaks the phase's contract with the human reviewing it.
- **Every non-obvious decision gets an ADR** in `docs/adr/`, same as v4 §1.
- **Commit per logical unit, not per phase.** A phase is many PRs, not one. Each PR states which phase and which item from that phase's checklist it satisfies.

---

## Design system reference (source of truth for Phase 1)

Built and delivered as `gymos-prototype.jsx` (screens, behavior) and `gymos-components.jsx` (component catalog), plus a Figma file (`GymOS — Design System & Screens`) with the same values encoded as real bound variables. Treat the values below as canonical; translate them into whatever token mechanism Phase 0 found (Tamagui `tokens.ts`, a NativeWind Tailwind config, or otherwise) — do not re-derive or approximate them. Figma is currently out of scope for this repo.

### Color — primitives

```
zinc/50 #FAFAFA   zinc/100 #F4F4F5  zinc/200 #E4E4E7  zinc/300 #D4D4D8  zinc/400 #A1A1AA
zinc/500 #71717A  zinc/600 #52525B  zinc/800 #27272A  zinc/900 #18181B  zinc/950 #09090B
blue/50 #EFF6FF   blue/300 #93C5FD  blue/400 #60A5FA  blue/600 #2563EB  blue/700 #1D4ED8  blue/950 #172554
sky/400 #38BDF8   sky/500 #0EA5E9
rose/50 #FFF1F2   rose/300 #FDA4AF  rose/400 #FB7185  rose/500 #F43F5E  rose/600 #E11D48  rose/700 #BE123C  rose/950 #4C0519
orange/300 #FDBA74  orange/400 #FB923C
amber/50 #FFFBEB  amber/200 #FDE68A  amber/300 #FCD34D  amber/400 #FBBF24  amber/500 #F59E0B  amber/700 #B45309  amber/950 #451A03
red/50 #FEF2F2    red/300 #FCA5A5   red/400 #F87171   red/500 #EF4444   red/700 #B91C1C   red/950 #450A0A
white #FFFFFF
tint/coach-light #F5F8FF   tint/coach-dark #0B1220
tint/client-light #FFF8F5  tint/client-dark #150F14
```

### Color — semantic (light | dark)

```
canvas             zinc/50   | zinc/950
surface             white    | zinc/900
border              zinc/200 | zinc/800
text-primary        zinc/900 | zinc/50
text-secondary      zinc/500 | zinc/400
text-faint          zinc/400 | zinc/600
surface-hover       zinc/100 | zinc/800
chip-text           zinc/600 | zinc/300
track (ring bg)      zinc/200 | zinc/800
alert-text          red/500  | red/400
alert-wash          red/50   | red/950
alert-wash-text     red/700  | red/300
milestone-fill      amber/500 (same both themes)
milestone-text      amber/700 | amber/300
milestone-wash      amber/50  | amber/950
milestone-stroke-1  amber/400 | amber/200
milestone-stroke-2  amber/500 | amber/400
```

### Color — role (Coach = blue, Client = coral; light | dark)

```
coach/accent-bg          blue/700 (both) — white text
coach/accent-text        blue/700  | blue/400
coach/accent-wash        blue/50   | blue/950
coach/accent-wash-text   blue/700  | blue/300
coach/weave-stroke-1,2   sky/500,blue/600  | sky/400,blue/400

client/accent-bg         rose/600 (both) — white text
client/accent-text       rose/600  | rose/400
client/accent-wash       rose/50   | rose/950
client/accent-wash-text  rose/700  | rose/300
client/weave-stroke-1,2  orange/400,rose/500 | orange/300,rose/400

canvas-tint (new — see P1 scope note below)
  coach/light  #F5F8FF   coach/dark  #0B1220
  client/light #FFF8F5   client/dark #150F14
```

### Typography

UI face: **Inter**. Data/numeric face: **Roboto Mono** (tabular figures — every stat, every metric readout).

```
Display/Large Title   Inter Bold 30/36
Heading/Title         Inter Bold 20/26
Heading/Headline      Inter Semi Bold 16/22
Body/Default          Inter Regular 14/22
Body/Medium           Inter Medium 14/20
Caption/Default       Inter Regular 12/16
Caption/Medium        Inter Medium 12/16
Mono/Caption          Roboto Mono Regular 12/16
Mono/Body             Roboto Mono Medium 14/20
Mono/Stat-MD          Roboto Mono SemiBold 18/24
Mono/Stat-LG          Roboto Mono SemiBold 24/28
Mono/Display          Roboto Mono Bold 36/40
```

### Spacing scale (px)

`2xs 2 · xs 4 · sm 6 · md 8 · lg 10 · xl 12 · 2xl 14 · 3xl 16 · 4xl 20 · 5xl 24 · 6xl 32 · 7xl 40 · 8xl 48 · 9xl 64`

### Radius scale (px)

`md 8 · lg 12 · xl 16 · 2xl 24 · full 999`

### Elevation

`Card` — 0/1/3/0, black @ 6% · `Overlay` (modal/sheet) — 0/8/24/-4, black @ 18%

### Component inventory to match

**Atoms:** Avatar (sm/md/lg) · Badge (neutral/accent/milestone/alert) · Button (primary/secondary/ghost × sm/md/lg) · IconButton · StatPill · GoalTag · TextInput · Toggle · SegmentedControl · Skeleton.
**Molecules:** Card · GradientRing (single progress ring) · DualRings (adherence + review-promptness, nested) · **WeaveLine — the signature motif**: two colored threads (coach-blue, client-coral) crossing like a braid, encoding _relationship_ health, not raw progress. Four states — splash (draw-in), loading (pulse), idle/health (brightness ∝ real engagement per side), lost-signal (threads pull apart to parallel, flat). Do not simplify this to a generic progress bar — the crossing and the per-side vividness are the entire point (see `1-gymos-product-overview.md` / earlier design-spec conversation for the full rationale if it's not self-evident from the code). · NotificationRow · Modal · Sheet · Toast.
**Navigation:** WebHeader · MobileHeaderIOS · MobileHeaderAndroid · BottomNav (iOS/Android variants) · desktop sidebar.

### Screens already specified (reference implementation — behavior and layout, not code)

**Coach Web:** Dashboard · Clients (list/table) · Client Detail (tabs: Overview, Journey, Meal Plan, Messages, History) · Review Queue · Program Builder · Settings & Rate.
**Coach Mobile:** same set, compact layouts, bottom-nav shell.
**Client Web:** Dashboard (linear layout: greeting → 4-stat glance row → hero coaching card → 3-card supporting row) · Discovery · Coach Profile · Meal Plan · Notifications · Hire flow.
**Client Mobile:** same set, compact.

---

---

## Carried-forward guardrails (all phases)

Testing, CI, and definition-of-done discipline from v4 §§15–17 still apply throughout — this initiative does not get a lighter bar because it's "just a re-skin." In particular: no infinite spinners, loading/empty/error states implemented, authorization enforced server-side with a negative test, zero tenant-name conditionals, accessible (labelled controls, ≥44pt targets, contrast pass, RTL correct where applicable).
