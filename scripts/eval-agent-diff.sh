#!/usr/bin/env bash
# Deterministic scorer for coding-agent diffs. No LLM judge.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

echo "== banned: new Date() in persistence packages (tests excluded) =="
if grep -R --include='*.ts' --exclude='*.test.ts' -n 'new Date(' packages/modules packages/db; then
  fail "new Date() in packages/modules or packages/db (use Luxon)"
fi

echo "== banned: raw fetch() in packages/app (tests excluded) =="
if grep -R --include='*.ts' --include='*.tsx' --exclude='*.test.ts' --exclude='*.test.tsx' -nE '(^|[[:space:]=(])fetch\(' packages/app; then
  fail "raw fetch() in packages/app"
fi

echo "== app.ts line budget =="
lines="$(wc -l < apps/api/src/app.ts | tr -d ' ')"
if [ "$lines" -ge 400 ]; then
  fail "apps/api/src/app.ts is ${lines} lines (max 399)"
fi
echo "app.ts is ${lines} lines"

node_ver="$(node -v)"
echo "Node ${node_ver} (engines: >=22.11.0; CI uses .nvmrc)"

if [ "${EVAL_SKIP_TURBO:-}" = "1" ]; then
  echo "SKIP turbo (EVAL_SKIP_TURBO=1)"
else
  echo "== pnpm lint =="
  pnpm lint
  echo "== pnpm typecheck =="
  pnpm typecheck
  echo "== pnpm test =="
  pnpm test
fi

echo "PASS"
