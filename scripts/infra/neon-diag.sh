#!/usr/bin/env bash
# TEMPORARY: does the exact URL form OpenTofu builds work? Prints only counts, host names and psql result lines.
set -uo pipefail
pw="$TF_VAR_neon_database_password"
echo "password length=${#pw} non-alphanumeric chars=$(printf %s "$pw" | tr -d 'A-Za-z0-9' | wc -c | tr -d ' ')"
host="ep-red-base-aza2lt0r-pooler.c-3.ap-southeast-1.aws.neon.tech"
r=$(PGCONNECT_TIMEOUT=10 psql "postgresql://gymos:${pw}@${host}/gymos?sslmode=require" -Atc 'select 1' 2>&1 | head -1)
echo "url-form pooled test branch -> $r"
r=$(PGCONNECT_TIMEOUT=10 psql "postgresql://gymos:${pw}@ep-red-base-aza2lt0r.c-3.ap-southeast-1.aws.neon.tech/gymos?sslmode=require" -Atc 'select 1' 2>&1 | head -1)
echo "url-form direct test branch -> $r"
