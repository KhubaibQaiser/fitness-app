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

url=$(curl -fsS -H "$auth" "$api/v6/deployments?projectId=$project&target=production&state=READY&limit=1&$q" | jq -r '.deployments[0].url // empty')
if [ -n "${FORCE_DEPLOY:-}" ] || [ -z "$url" ]; then
  url=""
  echo "No ready production deployment: starting one from main"
  id=$(curl -fsS -X POST -H "$auth" -H 'Content-Type: application/json' "$api/v13/deployments?forceNew=1&$q" \
    -d "$(jq -n --arg n "$project" --arg i "$GITHUB_REPOSITORY_ID" \
      '{name:$n, project:$n, target:"production", gitSource:{type:"github", ref:"main", repoId:($i|tonumber)}}')" | jq -er .id)
  for _ in $(seq 1 60); do
    d=$(curl -fsS -H "$auth" "$api/v13/deployments/$id?$q")
    state=$(jq -r .readyState <<<"$d"); echo "deployment $id: $state"
    case "$state" in READY) url=$(jq -r .url <<<"$d"); break ;; ERROR|CANCELED) echo "deployment failed: $(jq -r .inspectorUrl <<<"$d")"; dump_logs "$id"; exit 1 ;; esac
    sleep 10
  done
  [ -n "$url" ] || { echo "deployment timed out"; exit 1; }
fi

echo "Smoke: https://$url"
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
[ "$(code "https://$url/health/live")" = 200 ] || { echo "/health/live failed"; exit 1; }
[ "$(code "https://$url/health/ready")" = 200 ] || { echo "/health/ready failed (pooled Neon connection)"; exit 1; }
[ "$(code "https://$url/internal/cron/nightly")" = 401 ] || { echo "cron route must reject unauthenticated calls"; exit 1; }
echo "OK"
