#!/usr/bin/env bash
# Prints recent runtime log lines of the newest production deployment of a Vercel project (default gymos-api).
# The stream is cut after 25s. Hobby keeps runtime logs for about an hour. Needs VERCEL_API_TOKEN, optional VERCEL_TEAM_ID.
set -euo pipefail
project=${1:-gymos-api}
q="x=1${VERCEL_TEAM_ID:+&teamId=$VERCEL_TEAM_ID}"
auth="Authorization: Bearer $VERCEL_API_TOKEN"; api="https://api.vercel.com"
uid=$(curl -fsS -H "$auth" "$api/v6/deployments?projectId=$project&target=production&state=READY&limit=1&$q" | jq -er '.deployments[0].uid')
pid=$(curl -fsS -H "$auth" "$api/v9/projects/$project?$q" | jq -er .id)
echo "Newest production deployment: $uid"
curl -sS --max-time 25 -H "$auth" "$api/v1/projects/$pid/deployments/$uid/runtime-logs?$q" |
  jq -r '"\(.level // "info") \(.requestMethod // "") \(.requestPath // "") \(.responseStatusCode // "") | \(.message // "")"' 2>/dev/null | tail -n 120 | cut -c1-500 || true
