#!/usr/bin/env bash
# API-level version of the manual pass (ADR-0016, spec section E) against a Vercel API deployment that is
# backed by the Neon TEST branch. Mutates data (creates one client), so never point it at production.
# Usage: PILOT_COACH_PASSWORD=... vercel-api-acceptance.sh https://<deployment-host>
set -euo pipefail
base="${1:?base url}"
: "${PILOT_COACH_PASSWORD:?set PILOT_COACH_PASSWORD}"
jar=$(mktemp); body=$(mktemp); trap 'rm -f "$jar" "$body"' EXIT
stamp=$(date +%s)
slow=20 # seconds; Vercel Hobby functions are limited to 60s, so flag anything this close to it as a risk

# call <name> <want-status> <method> <path> [json]  -> response in $body
call() {
  local name=$1 want=$2 method=$3 path=$4 json=${5-} out code secs
  local args=(-sS -o "$body" -w '%{http_code} %{time_total}' -X "$method" -b "$jar" -c "$jar" "$base$path")
  [ -z "$json" ] || args+=(-H 'content-type: application/json' -d "$json")
  out=$(curl "${args[@]}")
  code=${out% *}; secs=${out#* }
  if [ "$code" != "$want" ]; then
    echo "FAIL $name -> $code (want $want) in ${secs}s; body: $(head -c 400 "$body" | tr '\n' ' ')"; exit 1
  fi
  local note=""; awk "BEGIN{exit !($secs > $slow)}" && note=" SLOW"
  echo "ok $name -> $code in ${secs}s$note"
}
is_pdf() { # name
  local magic size; magic=$(head -c 4 "$body"); size=$(wc -c < "$body" | tr -d ' ')
  [ "$magic" = "%PDF" ] && [ "$size" -gt 500 ] || { echo "FAIL $1 is not a PDF (magic='$magic' size=$size)"; exit 1; }
  echo "ok $1 is a PDF ($size bytes)"
}

call "login" 200 POST /v1/auth/login "$(jq -n --arg p "$PILOT_COACH_PASSWORD" '{email:"coach@pilot.local",password:$p}')"
call "me" 200 GET /v1/me

onboard=$(jq -n --arg n "Acceptance $stamp" --arg e "acceptance-$stamp@example.com" '{
  client:{name:$n, sex:"M", phone:"+923001112233", email:$e, heightCm:178, activityLevel:1.55,
          intake:{signaturePngBase64:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", signedAt:"2026-08-06T12:00:00.000Z", heightDisplayUnit:"cm"}},
  vitals:{weightKg:82, waistCm:90},
  goal:{preset:"LOSE", rate:"CONSERVATIVE", startWeightKg:82, targetWeightKg:75},
  dietary:[{type:"ALLERGY_SEVERE", code:"allergen:peanut"}]}')
call "create client (onboard)" 200 POST /v1/clients/onboard "$onboard"
client=$(jq -er .client.id "$body")

call "credentials pdf" 200 GET "/v1/clients/$client/credentials.pdf"; is_pdf "credentials pdf"

call "generate 7-day plan" 200 POST "/v1/clients/$client/meal-plans/generate" '{}'
plan=$(jq -er .plan.id "$body")
call "diet plan pdf" 200 GET "/v1/meal-plans/$plan/diet-plan.pdf"; is_pdf "diet plan pdf"
call "publish plan" 200 POST "/v1/meal-plans/$plan/publish" '{"reviewed":true,"acknowledgeDrift":true}'
call "complete check-in" 200 POST "/v1/clients/$client/check-ins" '{"vitals":{"weightKg":81.5},"adherenceRating":4}'
echo "check-in verdict: $(jq -r .verdict.type "$body")"
echo "ACCEPTANCE OK"
