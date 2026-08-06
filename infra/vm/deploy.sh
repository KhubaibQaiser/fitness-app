#!/usr/bin/env bash
# Runs ON the VM (invoked by the deploy workflow over SSH).
# Usage: deploy.sh <image-tag>   |   deploy.sh --rollback
set -euo pipefail

cd /srv/gymos

CURRENT_TAG_FILE=.current-tag
PREVIOUS_TAG_FILE=.previous-tag

if [[ "${1:-}" == "--rollback" ]]; then
  if [[ ! -f "$PREVIOUS_TAG_FILE" ]]; then
    echo "no previous tag recorded — cannot rollback" >&2
    exit 1
  fi
  TAG="$(cat "$PREVIOUS_TAG_FILE")"
  echo "rolling back to ${TAG}"
else
  TAG="${1:?usage: deploy.sh <image-tag> | --rollback}"
  if [[ -f "$CURRENT_TAG_FILE" ]]; then
    cp "$CURRENT_TAG_FILE" "$PREVIOUS_TAG_FILE"
  fi
fi

export IMAGE_TAG="$TAG"
set -a; source ./.env; set +a

docker compose -f compose.prod.yml pull web api worker
docker compose -f compose.prod.yml up -d --remove-orphans

echo -n "$TAG" > "$CURRENT_TAG_FILE"

# Smoke: readiness must pass within 60s or we fail the deploy (workflow rolls back).
for i in $(seq 1 12); do
  if curl -fsS "https://${PILOT_HOSTNAME}/health/ready" >/dev/null 2>&1; then
    echo "deploy healthy: ${TAG}"
    exit 0
  fi
  sleep 5
done
echo "readiness check failed after deploy" >&2
exit 1
