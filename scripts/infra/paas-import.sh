#!/usr/bin/env bash
# Idempotent one-time adoption of the resources first created from a laptop (local state) into the R2 state.
# Skips anything already in state. Needs: NEON_API_KEY, VERCEL_API_TOKEN, optional VERCEL_TEAM_ID, TF_VAR_neon_org_id.
set -euo pipefail
cd "$(dirname "$0")/../../infra/paas"
name="${TF_VAR_project_name:-gymos-pilot}"
have() { tofu state list 2>/dev/null | grep -qx "$1"; }

if ! have neon_project.pilot; then
  code=$(curl -sS -o /tmp/nproj.json -w '%{http_code}' -H "Authorization: Bearer $NEON_API_KEY" \
    "https://console.neon.tech/api/v2/projects?org_id=${TF_VAR_neon_org_id}&limit=400")
  [ "$code" = 200 ] || { echo "Neon project lookup failed with HTTP $code: $(jq -r '.message // empty' /tmp/nproj.json 2>/dev/null)"; exit 1; }
  id=$(jq -r --arg n "$name" '.projects[] | select(.name==$n) | .id' /tmp/nproj.json | head -n1)
  if [ -n "$id" ]; then tofu import -input=false neon_project.pilot "$id"; else echo "no Neon project named $name: apply will create it"; fi
fi

if ! have vercel_project.web; then
  q=""; [ -z "${VERCEL_TEAM_ID:-}" ] || q="?teamId=$VERCEL_TEAM_ID"
  code=$(curl -sS -o /tmp/vproj.json -w '%{http_code}' -H "Authorization: Bearer $VERCEL_API_TOKEN" "https://api.vercel.com/v9/projects/$name$q")
  case "$code" in
    200) tofu import -input=false vercel_project.web "${VERCEL_TEAM_ID:+$VERCEL_TEAM_ID/}$(jq -er .id /tmp/vproj.json)" ;;
    404) echo "no Vercel project named $name: apply will create it" ;;
    *) echo "Vercel project lookup failed with HTTP $code"; exit 1 ;;
  esac
fi
