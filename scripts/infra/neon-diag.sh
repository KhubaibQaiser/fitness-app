#!/usr/bin/env bash
# TEMPORARY: which Neon endpoints accept the role password? Prints only host names and psql result lines.
set -uo pipefail
api="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
auth="Authorization: Bearer $NEON_API_KEY"
which psql >/dev/null || { echo "no psql"; exit 0; }
curl -fsS -H "$auth" "$api/endpoints" | jq -r '.endpoints[] | "\(.id) \(.host) branch=\(.branch_id) pooled=\(.pooler_enabled)"'
for h in $(curl -fsS -H "$auth" "$api/endpoints" | jq -r '.endpoints[].host'); do
  for host in "$h" "$(echo "$h" | sed -E 's/^([^.]+)/\1-pooler/')"; do
    r=$(PGPASSWORD="$TF_VAR_neon_database_password" PGCONNECT_TIMEOUT=10 psql "postgresql://gymos@$host/gymos?sslmode=require" -Atc 'select 1' 2>&1 | head -1)
    echo "$host -> $r"
  done
done
