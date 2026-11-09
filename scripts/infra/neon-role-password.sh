#!/usr/bin/env bash
# Reads the existing Neon role password (an imported project does not carry it in state) and exports it to the
# job as a masked TF_VAR. Needs NEON_API_KEY and NEON_PROJECT_ID; GITHUB_ENV is set by Actions.
set -euo pipefail
api="https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}"
auth="Authorization: Bearer $NEON_API_KEY"
role="${NEON_ROLE:-gymos}"
branch=$(curl -fsS -H "$auth" "$api/branches" | jq -er '.branches[] | select(.default) | .id')
pw=$(curl -fsS -H "$auth" "$api/branches/$branch/roles/$role/reveal_password" | jq -er .password)
echo "::add-mask::$pw"
echo "TF_VAR_neon_database_password=$pw" >> "$GITHUB_ENV"
