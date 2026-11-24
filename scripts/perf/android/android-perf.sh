#!/bin/bash
# Records GymOS Android performance with built-in tools.
# Usage: PILOT_COACH_PASSWORD=... android-perf.sh <package> <outDir> <apiBase>
# Needs a running emulator or USB device with the release build installed and signed in as the
# seeded coach, and the API at <apiBase> on this Mac (see README.md).
set -euo pipefail
PKG="${1:?package, e.g. app.gymos.coach}"; OUT="${2:?output folder}"; API="${3:?API base, e.g. http://localhost:8080}"
mkdir -p "$OUT/screens"
# "<key> <path>" per screen, resolved against the API's data; fails here, before any device work.
ROUTES=$(node "$(dirname "$0")/../../visual/native-routes.mjs" "$API")
adb wait-for-device
ACTIVITY=$(adb shell cmd package resolve-activity --brief "$PKG" | tail -1 | tr -d '\r')
echo "device: $(adb shell getprop ro.product.model | tr -d '\r'), android $(adb shell getprop ro.build.version.release | tr -d '\r'), activity $ACTIVITY"

echo "== cold start x10"
: > "$OUT/cold-start.txt"
for i in $(seq 1 10); do
  adb shell am force-stop "$PKG"; sleep 2
  adb shell am start -W -n "$ACTIVITY" | grep -E "TotalTime|WaitTime" | tr -d '\r' | tr '\n' ' ' >> "$OUT/cold-start.txt"
  echo >> "$OUT/cold-start.txt"
done
awk '/TotalTime/ {for (i=1;i<=NF;i++) if ($i=="TotalTime:") print $(i+1)}' "$OUT/cold-start.txt" | sort -n | awk '{a[NR]=$1} END {print "median TotalTime ms:", a[int((NR+1)/2)]}' | tee -a "$OUT/cold-start.txt"

echo "== full run: screen recording, per-screen screenshots, frame stats, Perfetto trace of the roster scroll"
adb shell am force-stop "$PKG"
adb shell dumpsys gfxinfo "$PKG" reset >/dev/null
# Long enough for the route loop (about 7 s a screen) plus the roster swipes; screenrecord caps at 180 s.
ROUTE_COUNT=$(printf '%s\n' "$ROUTES" | wc -l | tr -d ' ')
REC_LIMIT=$((ROUTE_COUNT * 7 + 30))
if [ "$REC_LIMIT" -gt 180 ]; then REC_LIMIT=180; fi
adb shell screenrecord --bit-rate 8000000 --time-limit "$REC_LIMIT" /sdcard/gymos-run.mp4 &
REC=$!
adb shell am start -n "$ACTIVITY" >/dev/null
sleep 5
# adb reads stdin, so every adb call inside the loop gets /dev/null or it would eat the route list.
open_route() { adb shell "am start -a android.intent.action.VIEW -d 'gymos://$1' $PKG" </dev/null >/dev/null; }
# Step through every screen by deep link; screenshot 5 s after each.
while read -r key path; do
  open_route "$path"
  sleep 5
  adb exec-out screencap -p </dev/null > "$OUT/screens/$key.png"
  echo "shot $key"
done <<< "$ROUTES"
# Scroll the roster a few times for frame stats, with a Perfetto trace around the swipes.
open_route /clients
sleep 4
adb shell perfetto -o /data/misc/perfetto-traces/gymos.pftrace -t 15s sched freq idle am wm gfx view binder_driver dalvik input res memory >/dev/null 2>&1 &
TRACE=$!
sleep 2 # let tracing start before the first swipe
for i in 1 2 3 4 5; do adb shell input swipe 500 1600 500 500 250; sleep 0.6; done
adb shell dumpsys gfxinfo "$PKG" > "$OUT/gfxinfo-run.txt"
adb shell dumpsys meminfo "$PKG" > "$OUT/meminfo.txt"
wait "$TRACE" || true # perfetto stops itself after 15 s; its exit status says nothing about the file, and the pull below fails if there is none
adb pull /data/misc/perfetto-traces/gymos.pftrace "$OUT/trace.pftrace" >/dev/null
# SIGINT makes screenrecord finish the MP4 (a plain kill of the local adb leaves it unplayable).
adb shell pkill -INT screenrecord || true # exits 1 when the time limit already stopped it
wait "$REC" || true # adb returns screenrecord's signal status; the pull below fails if there is no file
sleep 2 # give the device a moment to flush the finished file
adb pull /sdcard/gymos-run.mp4 "$OUT/run.mp4" >/dev/null
grep -E "Janky frames|50th|90th|95th|99th" "$OUT/gfxinfo-run.txt" | head -6
grep -E "TOTAL PSS|TOTAL:" "$OUT/meminfo.txt" | head -2
echo "done: $OUT"
