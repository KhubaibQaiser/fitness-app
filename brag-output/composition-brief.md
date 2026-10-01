# Hyperframes Composition Brief: GymOS

## Objective

Create a short launch-style brag video for GymOS.

## Output

- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21 seconds

## Source Material

- Project root: the GymOS monorepo
- Primary files read: `packages/app` coach home, meal plan editor, publish confirm, weight journey; `CLAUDE.md` color and type tokens; `packages/db` demo seed
- Product name: GymOS
- Tagline / strongest claim: Severe allergies are hard blocks in the meal engine. Publish only after you have reviewed the plan.
- Key UI or visual moment to recreate: Due today row, AI meal draft, portion change, publish button, weight journey
- Copy that must appear verbatim:
  - Severe allergies are hard blocks in the meal engine.
  - Due today
  - AI suggestion. Review before publish
  - Publish only after you have reviewed the plan.
  - I reviewed this plan. Publish
  - Weight journey
  - Goal progress

## Creative Direction

- Tone preset: cinematic
- Creative direction: night-desk product film. Big type on the left, the working app on the right, hard cuts on the music.
- Interpretation: the first two seconds are one word. The middle is the product being used. The logo is the last card.
- Angle: The week is drafted around the person. It does not ship until the coach reviews it.
- Hook: Peanut.
- Outro / punchline: 84.5 kg, ahead, then GymOS.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - A slideshow of floating screenshots
  - Opening on the logo

## Visual Identity

- Background: #0B1220
- Text: #F4F4F5 on dark, #18181B on #F5F8FF
- Accent: #2563EB, allergy #E11D48
- Display font: Inter Bold
- Body font: Inter, numbers Roboto Mono
- Visual references from the project: coach blue, coral allergy, light canvas panel, Due today badge, publish pill

## Storyboard

Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:

1. Peanut — 2.15s — the allergy, full frame
2. Due today — 2.10s — the client row
3. The draft — 6.85s — three foods, one by one
4. You review — 5.26s — portion, then the publish button
5. It lands — 4.64s — the weight line, the ring, GymOS

## Audio

- Audio role: dense rhythmic layer
- Audio arc: bed from the first frame, hits only on the hook, the foods, the click, and the publish
- Music: bed.mp3 trimmed from happy-beats-business-moves-vol-11
- Music treatment: constant under the picture
- Music cue guidance: strong cues at 0.05, 2.15, 4.25, 7.41, 11.10, 16.36 after the 1.55s trim
- Audio-reactive treatment: subtle glow on bass, or skipped if extraction fails
- Audio-coupled moments:
  - hook — impact
  - meals — three card places
  - portion — click
  - publish — soft bell
- SFX selection guidance: low high-frequency risk only
- SFX analysis guidance: brag skill `assets/sfx/sfx-analysis.md`
- Exact SFX choice: impactSoft_medium_000, card-place-1, click_003, bong_001
- Audio files: copied into `brag-output/composition/assets/`

## Hyperframes Instructions

Standalone composition. GSAP paused timeline. Do not open on the logo. Show the product being used. Keep text at video size. 21 seconds.
