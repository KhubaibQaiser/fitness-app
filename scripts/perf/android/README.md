# GymOS Android performance kit

Run this on a Mac with **at least 20 GB free** (the capture Mac had about 6 GB, so Android was not run there). Everything below uses Google's own tools (`adb`, `dumpsys`, Perfetto, `screenrecord`), so nothing extra needs installing beyond the Android SDK.

An emulator measures the app on your Mac's CPU, not a phone's. Treat emulator numbers as relative (before/after a change). For real numbers, repeat the same script on a mid-range Android phone connected by USB, the kind most coaches in Pakistan carry.

## 1. One-time setup

```bash
brew install --cask android-commandlinetools zulu@17
```

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "cmdline-tools;latest" "platform-tools" "emulator" "platforms;android-36" "build-tools;36.0.0" "system-images;android-36;google_apis;arm64-v8a"
```

Use `x86_64` instead of `arm64-v8a` on an Intel Mac. Then create two emulator profiles: a Pixel 8, and a deliberately weaker device (2 cores, 3 GB RAM) closer to a budget phone:

```bash
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n gymos-pixel8 -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_8
```

```bash
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n gymos-budget -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_4a
```

Then edit `~/.android/avd/gymos-budget.avd/config.ini`: set `hw.cpu.ncore=2` and `hw.ramSize=3072`.

## 2. Build a release APK (in a worktree, so the repo stays clean)

The native `android/` folder is not gitignored, so build from a separate worktree:

```bash
git -C fitness-app worktree add --detach ../gymos-android main
```

```bash
cd ../gymos-android && pnpm install --frozen-lockfile && cd apps/mobile && npx install-skia
```

`install-skia` is needed because pnpm 10 skips Skia's install script. Start the API locally pointed at a local database (see the revamp notes: the repo `.env` points at a remote database, so override `DATABASE_URL`). Then build. The release variant is signed with the debug keystore, which is fine for measuring:

```bash
emulator -avd gymos-pixel8 -no-snapshot-save -no-audio &
```

```bash
adb reverse tcp:8080 tcp:8080 && EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo run:android --variant release
```

Open the app once and sign in as the seeded coach (`coach@pilot.local`); the session persists between runs. The script reaches each screen by deep link (`gymos:///<route>`), so the app needs no audit-only edits.

## 3. Measure

From the repo root of that worktree, with the API still running and `PILOT_COACH_PASSWORD` set to the password the database was seeded with (the script signs in to find which clients to open):

```bash
bash scripts/perf/android/android-perf.sh app.gymos.coach out-pixel8 http://localhost:8080
```

Then switch to the budget profile, reinstall, and run it again into `out-budget`.

What it records, and how to read each:

| File             | Tool                   | What it tells you                                                                                            | Good                                                                   |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `cold-start.txt` | `am start -W`, 10 runs | Time to first frame after a cold launch (TotalTime)                                                          | under 1.5 s median on a mid-range phone                                |
| `gfxinfo-*.txt`  | `dumpsys gfxinfo`      | Janky frames % and 50/90/95/99th percentile frame time while scrolling the roster and moving between screens | under 5% janky; 90th percentile under 16 ms (60 Hz)                    |
| `meminfo.txt`    | `dumpsys meminfo`      | Total PSS memory after visiting every screen                                                                 | stable; watch for growth between runs                                  |
| `trace.pftrace`  | Perfetto               | A full system trace (CPU per thread, frames, binder, GC) for 20 s                                            | open at ui.perfetto.dev; look for long frames on the UI and JS threads |
| `run.mp4`        | `screenrecord`         | A video of the whole run, for spotting blank frames and slow skeletons                                       |                                                                        |
| `screens/*.png`  | `screencap`            | One screenshot per coach screen, opened by deep link, 5 s after each                                         | compare with iOS and web                                               |

## 4. JavaScript profile (optional, debug build)

Shake the device or press `m` in Metro, choose "Enable Sampling Profiler", repeat the slow action, disable it, then pull the profile with:

```bash
npx react-native profile-hermes
```

Open the `.cpuprofile` in Chrome DevTools (Performance tab, Load profile).

## 5. What to send back

The `out-*` folders. The revamp report has an Android section waiting for these numbers.
