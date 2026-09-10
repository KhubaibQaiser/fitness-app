#!/usr/bin/env bash
# Validate and deliver GymOS Archify diagrams, then refresh README PNGs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARCHIFY="${ARCHIFY_BIN:-$ROOT/.agents/skills/archify/bin/archify.mjs}"
OUT="$ROOT/docs/architecture"

if [[ ! -f "$ARCHIFY" ]]; then
  echo "Archify skill missing. Install with:" >&2
  echo "  npx -y skills add tt-a1i/archify --skill archify --agent cursor --copy --yes" >&2
  exit 1
fi

deliver() {
  local type="$1"
  local spec="$2"
  local html="$3"
  shift 3
  node "$ARCHIFY" validate "$type" "$spec" --quality showcase --json "$@" >/dev/null
  node "$ARCHIFY" deliver "$type" "$spec" "$html" --quality showcase --json "$@"
}

deliver architecture "$OUT/gymos-runtime.architecture.json" "$OUT/gymos-runtime.html" --repo-root "$ROOT"
deliver dataflow "$OUT/hybrid-nutrition.dataflow.json" "$OUT/hybrid-nutrition.html"
deliver workflow "$OUT/coach-journey.workflow.json" "$OUT/coach-journey.html"
deliver lifecycle "$OUT/meal-plan.lifecycle.json" "$OUT/meal-plan.html"

for name in gymos-runtime hybrid-nutrition coach-journey meal-plan; do
  node "$ARCHIFY" visual-check "$OUT/${name}.html" --json >/dev/null || true
  if [[ -f "$OUT/${name}.visual-check.1440x900.light.png" ]]; then
    cp "$OUT/${name}.visual-check.1440x900.light.png" "$OUT/${name}.png"
  fi
done

echo "Rendered diagrams in $OUT"
