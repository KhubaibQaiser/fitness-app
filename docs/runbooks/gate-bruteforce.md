# Runbook: access-gate bruteforce (failed-attempt spike)

1. `select count(*), date_trunc('hour', created_at) from access_gate_attempts where success=false group by 2 order by 2 desc limit 24;`
2. Rotate the key: set a new PILOT_ACCESS_KEY in GitHub Environments → redeploy → send the coach the new /enter link.
3. Cookies survive rotation (HMAC secret unchanged). To force re-entry everywhere, rotate GATE_COOKIE_SECRET too.
4. fail2ban handles SSH; the gate limiter is 5/min/IP in-process.
