# Runbook: TLS certificate issues (DNS-01 via DuckDNS)

1. `docker compose -f /srv/gymos/compose.prod.yml logs caddy | grep -i acme | tail -30`
2. Common causes: DUCKDNS_TOKEN rotated/invalid; DuckDNS TXT API hiccup; Let's Encrypt rate limit (5/week per domain — always debug against the staging CA).
3. Force retry: `docker compose -f /srv/gymos/compose.prod.yml restart caddy`.
