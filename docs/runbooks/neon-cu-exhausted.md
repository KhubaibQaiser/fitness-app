# Runbook: Neon compute quota (80% usage alert / suspension)

1. Neon console → project → usage. What burned CU-hours? (A DB-touching health probe or a runaway poller are the classic causes — probes must hit /health/live only.)
2. Suspended mid-month: upgrade the org to Launch (pay-as-you-go) to resume instantly — pilot cost ceiling is a few dollars — or wait for the monthly reset if the pilot can pause.
3. Verify scale-to-zero is active (it cannot be disabled on free) and no idle connections are pinned open.
