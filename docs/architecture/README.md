# Architecture diagrams

Interactive [Archify](https://github.com/tt-a1i/archify) maps of GymOS. Open the HTML in a browser (pan, zoom, search, light/dark, export). PNG previews are embedded from the root [README](../../README.md).

| Question                         | Type         | Spec                                                                 | Artifact                                         | Preview                       |
| -------------------------------- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| What runs where?                 | architecture | [gymos-runtime.architecture.json](./gymos-runtime.architecture.json) | [gymos-runtime.html](./gymos-runtime.html)       | [png](./gymos-runtime.png)    |
| How do calories get computed?    | dataflow     | [hybrid-nutrition.dataflow.json](./hybrid-nutrition.dataflow.json)   | [hybrid-nutrition.html](./hybrid-nutrition.html) | [png](./hybrid-nutrition.png) |
| How does a coach publish a plan? | workflow     | [coach-journey.workflow.json](./coach-journey.workflow.json)         | [coach-journey.html](./coach-journey.html)       | [png](./coach-journey.png)    |
| What states can a plan be in?    | lifecycle    | [meal-plan.lifecycle.json](./meal-plan.lifecycle.json)               | [meal-plan.html](./meal-plan.html)               | [png](./meal-plan.png)        |

JSON is the source of truth. HTML is a delivered artifact (do not hand-edit). PNG is a 1440×900 light screenshot for GitHub.

## Install Archify (once per clone)

The skill is not vendored. Restore it with the repo lockfile:

```bash
npx -y skills add tt-a1i/archify --skill archify --agent cursor --copy --yes
```

`skills-lock.json` at the repo root pins the skill. Verify:

```bash
node .agents/skills/archify/bin/archify.mjs doctor
```

## Regenerate

From the repo root, after the skill is installed:

```bash
./docs/architecture/render.sh
```

That validates each spec at `showcase` quality, delivers HTML, and copies the 1440×900 light screenshot to the short PNG name used by the README.

Do not add `via` / `labelAt` / `channelX` until `validate` diagnoses them. Keep `meta.quality_profile` as `"showcase"`. Architecture specs that cite files must keep `meta.repository.revision` as a full 40-character SHA that contains those blobs.
