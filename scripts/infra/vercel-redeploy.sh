#!/usr/bin/env bash
# Starts a production deployment of a Vercel project from main and waits for it. Used after an API_ORIGIN change,
# because the web rewrites read it at build time. Needs VERCEL_API_TOKEN, GITHUB_REPOSITORY_ID, optional VERCEL_TEAM_ID.
set -euo pipefail
project=${1:?project name}
q="x=1${VERCEL_TEAM_ID:+&teamId=$VERCEL_TEAM_ID}"
auth="Authorization: Bearer $VERCEL_API_TOKEN"; api="https://api.vercel.com"
id=$(curl -fsS -X POST -H "$auth" -H 'Content-Type: application/json' "$api/v13/deployments?forceNew=1&$q" \
  -d "$(jq -n --arg n "$project" --arg i "$GITHUB_REPOSITORY_ID" \
    '{name:$n, project:$n, target:"production", gitSource:{type:"github", ref:"main", repoId:($i|tonumber)}}')" | jq -er .id)
for _ in $(seq 1 90); do
  d=$(curl -fsS -H "$auth" "$api/v13/deployments/$id?$q"); state=$(jq -r .readyState <<<"$d"); echo "$project deployment $id: $state"
  case "$state" in READY) echo "https://$(jq -r .url <<<"$d")"; exit 0 ;; ERROR|CANCELED) echo "failed: $(jq -r .inspectorUrl <<<"$d")"; exit 1 ;; esac
  sleep 10
done
echo "timed out"; exit 1
