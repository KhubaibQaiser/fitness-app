# ADR-0019: Floodlight design tokens, Sunflower brand, runtime tenant theming and glass chrome

- **Status**: Proposed
- **Date**: 2026-11-23

## Context

The token study (`docs/revamp/reference/tokens.md`, explorer [GymOS Design Tokens](https://claude.ai/artifact/5CtV8ocVdgxBLyjXdsrL7a), owner-only) proposed two palettes and a glass variant. It recommended "Gym Floor Print, evolved". The owner chose **Floodlight**, with **glass on**, the tenant preview **Sunflower**, and a dark-first design that follows the system setting.

Today tenant branding is compiled in from `infra/tenants/pilot.json`: only `primary` reaches the theme, so a second tenant cannot recolour the app. Faint text and several status chips fail contrast (2.07–2.94:1).

## Decision

1. **Palette: Floodlight** (`docs/revamp/reference/tokens.md` §4.3, §5.2; generated set `docs/revamp/reference/tokens.floodlight.json`): cool graphite neutrals, electric ultramarine, volt lime and aqua, with separate emerald, amber, red and sky status hues. Three layers: primitive → semantic → component.
2. **Theme mode**: dark is the reference design; the app follows the system setting with an override in Account. Light mode is fully supported and contrast-checked.
3. **Brand: Sunflower `#FACC15`** is both the GymOS default brand and the pilot tenant's brand (`pilot.json` changes from `#1D4ED8`). Derived values on Floodlight: action fill `#FACC15` with ink label `#171B28` (11.2:1); light text-safe `#886D00` (4.87:1); light wash `#F7EED5`; dark text `#FACC15`; filled actions on light surfaces carry a 1px border.
4. **Runtime tenant theming**: one brand hex per tenant, validated at the manifest boundary (invalid throws). All other tones are derived in OKLCH per `tokens.md` §2.4. Tenants can never override neutrals, status, accent, chart, glass or scrim tokens. The severe-allergy chip is always the danger colour with an icon and words.
5. **Derived guardrail for Sunflower on Floodlight** (flagged to the owner, not a silent change): Sunflower is within ΔE 8.6–13.1 of volt lime (steps 300–400) and 7.6 of the amber-300 warning wash. So volt is used only for chart marks, never as a UI highlight fill next to actions; warning chips always carry an icon and a word and use amber step 500 or darker for fills. If the owner prefers volt highlights, he can rule otherwise.
6. **Glass: chrome only, all three platforms**. Glass covers the top bar, tab bar, sticky client header, sheets and the command-palette scrim. It never covers tables, lists, forms, data cards or status chips. Tokens are in `tokens.md` §9.2 (chrome tint 66% light / 76% dark; sheet 91% / 83% for Floodlight).
   - **iOS:** system materials (`expo-blur`; `expo-glass-effect` on iOS 26).
   - **Web:** `backdrop-filter` with an `@supports` solid fallback.
   - **Android:** blur on API 31+ through `BlurTargetView`, and the solid fallback below API 31.
   - **Accessibility:** Reduce Transparency, high contrast and a "Solid bars" Account setting all switch to the solid fallback.
   - **Release gate:** Android glass needs a pass on a low-end device before release.
7. **Type**: Inter (UI, tabular figures), Archivo at expanded widths (titles and hero numbers), Noto Nastaliq Urdu (Urdu reading and headings), Noto Naskh Arabic (dense Urdu UI); Roboto Mono retires.
8. `docs/design-system-reference.md` is replaced when foundation task F1 lands; the `gym-app` prototype stops being the design reference (ADR-0018).

## Consequences

**Easier:** one generated token source for web and native; any tenant colour works safely; contrast passes by construction.

**Harder:**

- Floodlight is weaker in light mode: volt drops to olive for marks and text.
- The auth illustration must be redrawn in Floodlight colours (owner's choice). The redraw comes after the track (task L1, rulings O6); until then the auth pages keep today's art.
- Sunflower actions need an ink label and border logic.
- Android glass needs device testing.

**Revisit when:** a low-end Android test shows dropped frames with glass on; or a tenant brand fails the collision checks often enough that onboarding should reject it.

## Alternatives considered

- **Gym Floor Print, evolved** (recommended by the study): calmer, continuous with the old auth art, better with tenant colours. Not chosen by the owner.
- **Glass with Android off**: safer for budget phones; the owner chose Android on with a device gate.
