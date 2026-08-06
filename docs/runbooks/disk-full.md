# Runbook: VM disk >80%

1. `df -h` → usual suspects: docker images/layers, logs.
2. `docker system prune -af --volumes=false` (NEVER prune volumes blindly — caddy certs + queue-db live there).
3. Log rotation is docker json-file 10MB×5 per service; if a service exploded, capture a sample before truncating.
