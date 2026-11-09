#!/usr/bin/env bash
# Deploys the Vercel API project from main if it has no ready production deployment (or FORCE_DEPLOY=true, so
# new env values take effect), then smoke-tests it.
# Needs: VERCEL_API_TOKEN, optional VERCEL_TEAM_ID, API_PROJECT (name), GITHUB_REPOSITORY_ID.
set -euo pipefail
project="${API_PROJECT:-gymos-api}"
q="x=1${VERCEL_TEAM_ID:+&teamId=$VERCEL_TEAM_ID}"
auth="Authorization: Bearer $VERCEL_API_TOKEN"
api="https://api.vercel.com"

dump_logs() { # last build log lines of a deployment (no secrets: Vercel redacts env values)
  curl -fsS -H "$auth" "$api/v3/deployments/$1/events?limit=-1&$q" | jq -r '.[] | select(.text != null) | .text' | tail -n 60 || true
}
# Show why the latest deployment failed, if it did.
bad=$(curl -fsS -H "$auth" "$api/v6/deployments?projectId=$project&limit=1&$q" | jq -r '.deployments[0] | select(.state=="ERROR") | .uid // empty')
[ -z "$bad" ] || { echo "Latest deployment $bad failed; last build log lines:"; dump_logs "$bad"; }

dep=$(curl -fsS -H "$auth" "$api/v6/deployments?projectId=$project&target=production&state=READY&limit=1&$q" | jq -r '.deployments[0] | "\(.url) \(.uid)" // empty')
url=${dep% *}; uid=${dep#* }; [ "$url" != null ] || { url=""; uid=""; }
if [ -n "${FORCE_DEPLOY:-}" ] || [ -z "$url" ]; then
  url=""
  echo "No ready production deployment: starting one from ${GITHUB_REF_NAME:-main}"
  id=$(curl -fsS -X POST -H "$auth" -H 'Content-Type: application/json' "$api/v13/deployments?forceNew=1&$q" \
    -d "$(jq -n --arg n "$project" --arg r "${GITHUB_REF_NAME:-main}" --arg i "$GITHUB_REPOSITORY_ID" \
      '{name:$n, project:$n, target:"production", gitSource:{type:"github", ref:$r, repoId:($i|tonumber)}}')" | jq -er .id)
  for _ in $(seq 1 60); do
    d=$(curl -fsS -H "$auth" "$api/v13/deployments/$id?$q")
    state=$(jq -r .readyState <<<"$d"); echo "deployment $id: $state"
    case "$state" in READY) url=$(jq -r .url <<<"$d"); uid=$id; break ;; ERROR|CANCELED) echo "deployment failed: $(jq -r .inspectorUrl <<<"$d")"; dump_logs "$id"; exit 1 ;; esac
    sleep 10
  done
  [ -n "$url" ] || { echo "deployment timed out"; exit 1; }
fi

echo "Smoke: https://$url"
check() { # path, expected status
  got=$(curl -s -o /tmp/smoke.body -w '%{http_code}' "https://$url$1")
  if [ "$got" = "$2" ]; then echo "ok $1 -> $got"; return 0; fi
  echo "FAIL $1 -> $got (want $2); body: $(head -c 400 /tmp/smoke.body | tr '\n' ' ')"; return 1
}
runtime_logs() { # last runtime log messages of the deployment (stream is cut after 25s)
  pid=$(curl -fsS -H "$auth" "$api/v9/projects/$project?$q" | jq -r .id)
  curl -sS --max-time 25 -H "$auth" "$api/v1/projects/$pid/deployments/$uid/runtime-logs?$q" | jq -r '.message // empty' 2>/dev/null | tail -n 40 | cut -c1-400 || true
}
rc=0
check /health/live 200 || rc=1
check /health/ready 200 || rc=1
check /internal/cron/nightly 401 || rc=1
if [ "$rc" = 0 ] && [ -n "${PILOT_COACH_PASSWORD:-}" ]; then
  echo "Acceptance pass against the Neon test branch:"
  "$(dirname "$0")/vercel-api-acceptance.sh" "https://$url" || rc=1
fi
if [ "$rc" = 0 ]; then echo OK; else echo "Runtime logs of $uid:"; runtime_logs; fi
exit "$rc"
