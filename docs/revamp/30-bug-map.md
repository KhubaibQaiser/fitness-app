# Bug and finding map

Every problem the audit found has one owning task, so nothing is fixed twice or forgotten. Numbers refer to [`reference/critique.md`](reference/critique.md): §7 for bugs 1–23, §9.3 for N1–N13. A later task that rebuilds the same screen keeps the earlier fix's test passing.

## Bugs (critique §7)

| #   | Bug                                                        | Owner                      | Also touches                   |
| --- | ---------------------------------------------------------- | -------------------------- | ------------------------------ |
| 1   | Attention ignores CHECKIN_OVERDUE                          | B1                         | S02, S03 via F7.1, F7.2        |
| 2   | Empty draft dead end with Publish                          | B2                         | S06                            |
| 3   | Adherence % stored as 1–5, shown as ~% or /10              | F2 (formatter)             | S07 (control), S05, S03        |
| 4   | Journey dates one day later than History                   | F7.4 (cause)               | F2 (date-only formatting), S05 |
| 5   | Chart window ends before the projected goal date           | F9                         | S04                            |
| 6   | False "Onboarding incomplete" banner, no way to sign       | S04                        | F7.7                           |
| 7   | Unit preferences ignored (vitals, check-in, roster, Home)  | F2 (formatters)            | S09, S07, S03, S02             |
| 8   | Verdict reason missing its unit                            | F7.8                       | S07                            |
| 9   | "Custom pace" against "Standard" for the same client       | F2 (pace formatter, cause) | S09 and S06 switch to it       |
| 10  | Plan tab hides the live plan                               | S06                        | F7.5                           |
| 11  | Targets styled like totals; fiber missing in the editor    | S06                        | F9 (macro bars)                |
| 12  | Desktop roster drops CHECKIN_OVERDUE                       | S03                        |                                |
| 13  | "Needs focus" for missing data; "−0.0 kg" in success green | F2 (status words)          | S04, F9                        |
| 14  | Roster "Progress" placeholder column                       | S03                        | F7.2                           |
| 15  | Age 30 assumed silently                                    | S08                        | S04 (Profile, Next steps)      |
| 16  | Phone numbers render raw                                   | F2                         | S04                            |
| 17  | "Picked by the AI planner" copy                            | S09                        |                                |
| 18  | Three date conventions                                     | F2                         | every screen                   |
| 19  | Accessibility props reach the web DOM as unknown props     | F5                         |                                |
| 20  | Hydration mismatch on /tools                               | S10                        |                                |
| 21  | Intake draft in memory only                                | S08                        | F7.9                           |
| 22  | Empty check-in can be submitted                            | F7.8 (server rule, O9)     | S07 (form)                     |
| 23  | Verdict lost on refresh                                    | S07                        |                                |

## Native (critique §9.3)

| #   | Problem                                            | Owner               | Also                   |
| --- | -------------------------------------------------- | ------------------- | ---------------------- |
| N1  | No top safe-area inset                             | B4                  | F6 (native headers)    |
| N2  | Hub header overlays content                        | B5                  | F10                    |
| N3  | Tab bar route always "/"                           | B4                  | F6 (native tabs)       |
| N4  | No native navigation                               | F6                  |                        |
| N5  | "Invalid Date" in Alerts                           | B6                  | F2, S12                |
| N6  | Login masks every error                            | B3                  | S01                    |
| N7  | Labels wrap mid-word; buttons truncate             | F2 (text rules)     | F5 (pickers), S09, S10 |
| N8  | First screen in the system font                    | F2                  |                        |
| N9  | Heavy card shadows                                 | F1 (tokens)         | F5 (card)              |
| N10 | Web-shaped controls, no haptics                    | F4 (haptics, press) | F5, F6                 |
| N11 | Inverted selected state in dark segmented controls | F5                  |                        |
| N12 | Portrait lock with tablet support                  | F6 (O8)             |                        |
| N13 | Square-cornered roster search and filter           | S03                 |                        |

## Cross-cutting (critique §6, top 10, perf)

| Finding                                                          | Owner                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Status chip and banner contrast (2.07–3.44:1)                    | F1                                                                                                  |
| Placeholder contrast 2.56:1                                      | F1, F5                                                                                              |
| Pre-disabled submits at 1.97:1                                   | F5 (buttons), every form screen                                                                     |
| 15 px inputs zoom iOS Safari                                     | F2, F5                                                                                              |
| No skip link                                                     | F6                                                                                                  |
| Colour-only dietary selection                                    | F5 (checkbox chip), S09                                                                             |
| No RTL readiness                                                 | F2                                                                                                  |
| Toast exists but unused; silent successes                        | F4 (toast), each screen's success state                                                             |
| Task screens lose the client                                     | F10                                                                                                 |
| Hub verbs behind a hamburger                                     | F10                                                                                                 |
| Raw system language                                              | F2 (status words), each screen's copy                                                               |
| Roster renders every client (5,795 nodes)                        | F7.2, S03                                                                                           |
| Tamagui runtime style cost (55% of roster script)                | F5 (static row styles), re-measured after U4                                                        |
| `formatChartDate` 200 ms and forced layout 61 ms                 | F9                                                                                                  |
| Icons 1.23 MB of the iOS bundle                                  | U4                                                                                                  |
| libphonenumber, date picker deps, `@tamagui/themes`              | F2, F5, F1                                                                                          |
| Client pages fetch after hydration; `config/public` late         | F7.3                                                                                                |
| `icon.png` 385 KB, `hero.jpg` 435 KB                             | F8                                                                                                  |
| Pollers multiply requests                                        | F7.1 (pulse)                                                                                        |
| Next.js 16.4.3 vulnerability                                     | U1                                                                                                  |
| 2 of about 39 generations solver-infeasible on synthetic clients | Not a UI bug: product follow-up for the meal-planner track; S06 only renders the failure state well |
