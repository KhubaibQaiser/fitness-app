#!/bin/bash
# Records GymOS Android performance with built-in tools. Usage: android-perf.sh <package> <outDir>
# Needs a running emulator or USB device with the release build installed (see README.md).
set -euo pipefail
PKG="${1:?package, e.g. app.gymos.coach}"; OUT="${2:?output folder}"
mkdir -p "$OUT/screens"
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

echo "== full run: screen recording, Perfetto trace, frame stats, per-screen screenshots"
adb shell am force-stop "$PKG"
adb shell dumpsys gfxinfo "$PKG" reset >/dev/null
adb shell screenrecord --bit-rate 8000000 --time-limit 170 /sdcard/gymos-run.mp4 &
REC=$!
adb shell perfetto -o /data/misc/perfetto-traces/gymos.pftrace -t 20s sched freq idle am wm gfx view binder_driver dalvik input res memory >/dev/null 2>&1 &
TRACE=$!
adb logcat -c
adb shell am start -n "$ACTIVITY" >/dev/null
# The audit route stepper logs "[audit-nav] <key>" every 9 s; screenshot 4 s after each step.
adb logcat -s ReactNativeJS:V | while read -r line; do
  case "$line" in
    *"[audit-nav] done"*) break ;;
    *"[audit-nav] "*)
      key=$(echo "$line" | sed -E 's/.*\[audit-nav\] ([a-z0-9-]+).*/\1/')
      sleep 4
      adb exec-out screencap -p > "$OUT/screens/$key.png"
      echo "shot $key"
      ;;
  esac
done
# Scroll the roster a few times for frame stats.
for i in 1 2 3 4 5; do adb shell input swipe 500 1600 500 500 250; sleep 0.6; done
adb shell dumpsys gfxinfo "$PKG" > "$OUT/gfxinfo-run.txt"
adb shell dumpsys meminfo "$PKG" > "$OUT/meminfo.txt"
wait "$TRACE" || true   # perfetto exits on its own after 20 s; a non-zero exit here only means it already finished
adb pull /data/misc/perfetto-traces/gymos.pftrace "$OUT/trace.pftrace" >/dev/null
kill "$REC" 2>/dev/null || true   # stop the recording early if the run finished first
sleep 2
adb pull /sdcard/gymos-run.mp4 "$OUT/run.mp4" >/dev/null
grep -E "Janky frames|50th|90th|95th|99th" "$OUT/gfxinfo-run.txt" | head -6
grep -E "TOTAL PSS|TOTAL:" "$OUT/meminfo.txt" | head -2
echo "done: $OUT"
