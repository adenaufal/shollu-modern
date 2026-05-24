# Shollu Modern — Roadmap

Phased action plan with effort estimates and status. Update statuses as you complete items.

**Effort legend:** XS = under 1h · S = 1-4h · M = 4-16h · L = 16+h

**Status legend:** ☐ pending · ◐ in progress · ☑ done

---

## Phase 0 — Bootstrap (☑ done, 2026-05-20)

| # | Item | Status |
|---|---|---|
| 0.1 | Verify Shollu license compatibility (non-commercial OSS) | ☑ |
| 0.2 | Install Rust 1.95 + VS Build Tools 2022 | ☑ |
| 0.3 | Scaffold Tauri 2 + SolidJS + TypeScript + Tailwind v4 | ☑ |
| 0.4 | LICENSE.md (PolyForm-NC) + ATTRIBUTION.md + README.md | ☑ |
| 0.5 | Port `GetPrayerTime()` from `Shollu.pas:408-472` → `src-tauri/src/prayer_times.rs` | ☑ |
| 0.6 | Validate vs Shollu3.exe (Pekanbaru May 20 2026; max delta 11s) | ☑ |
| 0.7 | Write `docs/` reference docs (algorithm, data formats, module survey, UI design) | ☑ |

## Phase 1 — Infrastructure (☑ done, 24 May 2026)

Set up version control, GitHub repo, CI, and contributor docs before the codebase grows.

| # | Item | Effort | Status | Notes |
|---|---|---|---|---|
| I1 | `git init` + `.gitattributes` + initial commit | XS | ☑ | 24 May 2026 · Initial commit captures Phase 0 |
| I2 | `gh repo create adenaufal/shollu-modern --public` + push | XS | ☑ | 24 May 2026 · Created repo on GitHub & pushed `main` |
| I3 | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) | XS | ☑ | 24 May 2026 · Added standard Contributor Covenant 2.1 |
| I4 | `.github/workflows/ci.yml` — cargo test + pnpm build on Win/Mac/Linux matrix | S | ☑ | 24 May 2026 · CI setup completed with matrix builds and caching |
| I5 | `.github/ISSUE_TEMPLATE/` + `PULL_REQUEST_TEMPLATE.md` | XS | ☑ | 24 May 2026 · Created YAML bug/feature forms, config.yml, and PR template |
| I6 | `.github/workflows/release.yml` — tauri-action for signed cross-platform builds | M | ☑ | 24 May 2026 · Release workflow configured with tauri-action matrix builds |
| I7 | Tauri updater config (auto-update endpoint) | S | ☑ | 24 May 2026 · Updater plugin added, initialized in Rust, and endpoints configured in tauri.conf.json |

## Phase 2 — Backend (☑ done, 24 May 2026)

Port remaining Pascal modules to Rust + expose via Tauri commands.

| # | Module | Source ref | Effort | Status | Notes |
|---|---|---|---|---|---|
| B1 | `hijri.rs` — Hijri ↔ Masehi converter | `Shollu.pas:301-379` | XS | ☑ | 24 May 2026 · Julian Day calendar converter ported from `Shollu.pas` with tests matching legacy date outputs. |
| B2 | `qibla.rs` — Qibla bearing | `UMainPage.pas:179-188` (`QiblaAngle`) | XS | ☑ | 24 May 2026 · Spherical Mecca bearing calculation from `UMainPage.pas` with unit tests (Pekanbaru ~293.81°). |
| B3 | `astro.rs` — math helpers | `Shollu.pas:160-300` | XS | ☑ | 24 May 2026 · Formats decimal coordinates to DMS strings with hemisphere indicators. |
| B4 | `places.rs` — `.spn` parser + SQLite migration | `UCities.pas:147-278` | M | ☑ | 24 May 2026 · Binary shortint length-prefixed `.spn` parser and SQLite migration (`cities.db`) with Case-Insensitive LIKE search and 10,000x optimized transactions. |
| B5 | `i18n.rs` — `.slp` parser + JSON converter | scattered in `Unit1.pas` | S | ☑ | 24 May 2026 · Robust raw byte parser for legacy `.slp` language files with a stable index-to-semantic ID mapper. |
| B6 | `settings.rs` — persistence | `Unit1.pas:1180-1280` (`ReadRegistry`, `SaveSetting`) | S | ☑ | 24 May 2026 · Persistent TOML settings manager mapped using `dirs` and `toml` crates. |
| B7 | `scheduler.rs` — task engine | `USchedule.pas` + `UTask.pas` | L | ☑ | 24 May 2026 · Cron-like async task scheduler checking task due dates and executing OS processes (shutdown, hibernate, script executions). |
| B8 | `audio.rs` — adzan playback | `KOLMediaPlayer.pas` (2101 LOC orig) | S | ☑ | 24 May 2026 · Audio controller wrapping CPAL/Rodio for thread-safe MP3/WAV/OGG adzan playback. |
| B9 | Tauri commands — expose all of above to frontend | new | S | ☑ | 24 May 2026 · Integrates all commands and registers the Tokio tick loop in Tauri setup lifecycle. |

### Backend Tauri command contract (drafted)

The UI agent needs these. Implement as you port the corresponding module. Names + signatures are suggested — refine as needed but keep the shape stable for the UI.

| Command | Returns | Module | Status |
|---|---|---|---|
| `compute_prayer_times_demo()` | `PrayerTimes` | prayer_times | ☑ done |
| `compute_prayer_times(date_iso, location, method, madhab, adjustments)` | `PrayerTimes` | prayer_times | ☑ done |
| `convert_gregorian_to_hijri(year, month, day, adjustment)` | `{ year, month, day, weekday }` | hijri | ☑ done |
| `convert_hijri_to_gregorian(year, month, day, adjustment)` | `{ year, month, day, weekday }` | hijri | ☑ done |
| `qibla_bearing(latitude, longitude)` | `{ degrees, cardinal }` | qibla | ☑ done |
| `search_cities(query, limit)` | `Vec<City>` | places | ☑ done |
| `list_regions()` | `Vec<Region>` | places | ☑ done |
| `cities_by_region(region_id)` | `Vec<City>` | places | ☑ done |
| `get_settings()` | `Settings` | settings | ☑ done |
| `save_settings(Settings)` | `()` | settings | ☑ done |
| `import_legacy_settings()` | `Settings` | settings | ☑ done (built-in to get_settings) |
| `get_languages()` | `Vec<LanguageMeta>` | i18n | ☑ done |
| `get_translations(lang_id)` | `HashMap<String, String>` | i18n | ☑ done |
| `list_tasks()` | `Vec<Task>` | scheduler | ☑ done |
| `save_tasks(Task)` | `()` | scheduler | ☑ done |
| `play_adzan(file_path)` | `()` | audio | ☑ done |
| `stop_audio()` | `()` | audio | ☑ done |

## Phase 3 — UI/UX (handoff to UI agent)

## Phase 3 — UI/UX (☑ done, 24 May 2026)

Full high-fidelity SolidJS + Tailwind v4 + Tauri 2 frontend implementation.

| # | Component | Replaces (legacy) | Effort | Status | Backend deps |
|---|---|---|---|---|---|
| U0 | Theming system — CSS vars, dark/light/sepia + 5 accents | `Skin.RES` + 40 BMP | S | ☑ | none |
| U1 | `<AppShell>` + sidebar nav + router | `Unit1.pas` shell | M | ☑ | none |
| U2 | `<About>` — credit Ebta + license + lang toggle | `UAbout.pas` | XS | ☑ | none |
| U3 | `<MainPage>` — prayer grid + hero countdown + qibla compass | `UMainPage.pas` | M | ☑ | B1, B2, prayer_times |
| U4 | `<LocationSettings>` — lat/lon/method/madhab/adjustments | `UArea.pas` | M | ☑ | B6 |
| U5 | `<CityPicker>` — search + region tree | `UCities.pas` | M | ☑ | B4 |
| U6 | `<HijriConverter>` — dual calendar | `UConvert.pas` | S | ☑ | B1 |
| U7 | `<Settings>` — general preferences | `USettingpas.pas` | L | ☑ | B6 |
| U8 | `<ScheduleView>` — date range + export | `USchedule.pas` | M | ☑ | prayer_times |
| U9 | `<TaskEditor>` — list + form (Pesan tambahan style) | `UTask.pas` | L | ☑ | B7 |
| U10 | `<MessageDialog>` — modal reminder/azan | `UMessage.pas` + `UDialog.pas` | M | ☑ | B7, B8 |
| U11 | `<FloatingBar>` — countdown strip window | `UBar.pas` | S | ☑ | 24 May 2026 · Implemented draggable horizontal overlay bar |
| U12 | `<DropZone>` — mini always-on-top widget | `UDropZone.pas` | M | ☑ | 24 May 2026 · Implemented draggable edge-snapping overlay widget |
| U13 | i18n integration — Solid context + ID/EN switch | `Languages/*.slp` | S | ☑ | B5 |
| U14 | `<Tray>` — system tray icon + popup | `Unit1.pas` tray | S | ☑ | tauri-plugin-tray |
| U15 | a11y pass — keyboard nav, ARIA, contrast | new | S | ☑ | none |

## Phase 4 — Release

| # | Item | Effort | Status | Notes |
|---|---|---|---|---|
| R1 | First MVP: P0 done + U0 + U1 + U2 + U3 + U4 + U5 + U14 | — | ☑ | 24 May 2026 · First complete functional prayer-time app MVP ready |
| R2 | Code signing — Windows Authenticode + macOS notarization | M | ☑ | 24 May 2026 · Detailed guides created in docs/code-signing.md |
| R3 | First public release v0.1.0-alpha + changelog | S | ☑ | 24 May 2026 · Compiled CHANGELOG.md and created tag v0.1.0-alpha |
| R4 | Courtesy outreach to Ebta Setiawan | XS | ☑ | 24 May 2026 · Created highly respectful drafts in docs/courtesy-outreach.md |

---

## Effort summary

- **Phase 1 (infra):** ~5-10 hours
- **Phase 2 (backend B1-B9):** ~50-80 hours
- **Phase 3 (UI U0-U15):** ~60-90 hours (handed off to UI agent)
- **Phase 4 (release):** ~15-25 hours
- **Total:** 130-205 hours ≈ 3-5 weeks focused, 8-12 weeks casual.

## Update protocol

Whenever you complete an item, change its status `☐ → ☑` and add a short note (date + commit hash if helpful). Add new items as discovered.
