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

## Phase 1 — Infrastructure (☐ pending)

Set up version control, GitHub repo, CI, and contributor docs before the codebase grows.

| # | Item | Effort | Status | Notes |
|---|---|---|---|---|
| I1 | `git init` + `.gitattributes` + initial commit | XS | ☐ | First commit captures all of Phase 0 |
| I2 | `gh repo create adenaufal/shollu-modern --public` + push | XS | ☐ | Description: "Modern cross-platform Islamic prayer reminder, revival of Shollu by Ebta Setiawan (2004-2012)." Topics: `tauri`, `tauri-v2`, `solidjs`, `typescript`, `rust`, `prayer-times`, `islamic`, `adzan`, `indonesia`, `muslim`, `desktop-app`, `cross-platform`, `noncommercial` |
| I3 | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) | XS | ☐ | Standard verbatim |
| I4 | `.github/workflows/ci.yml` — cargo test + pnpm build on Win/Mac/Linux matrix | S | ☐ | Linux needs `libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev` |
| I5 | `.github/ISSUE_TEMPLATE/` + `PULL_REQUEST_TEMPLATE.md` | XS | ☐ | Bug + Feature templates |
| I6 | `.github/workflows/release.yml` — tauri-action for signed cross-platform builds | M | ☐ | Defer until first feature MVP. Needs code-signing certs (later). |
| I7 | Tauri updater config (auto-update endpoint) | S | ☐ | Optional, post-MVP |

## Phase 2 — Backend (Rust, in `src-tauri/src/`)

Port remaining Pascal modules to Rust + expose via Tauri commands.

| # | Module | Source ref | Effort | Status | Notes |
|---|---|---|---|---|---|
| B1 | `hijri.rs` — Hijri ↔ Masehi converter | `Shollu.pas:301-379` | XS | ☐ | Reference test: `20 May 2026 → 3 Dzulhijjah 1447 H` (Penyesuaian = 0, from Shollu3 v3.10 screenshot). Pure integer arithmetic; one-shot port. |
| B2 | `qibla.rs` — Qibla bearing | `UMainPage.pas:179-188` (`QiblaAngle`) | XS | ☐ | Spherical bearing toward Mecca (MLAT=21.42333, MLONG=39.823333). Single function. |
| B3 | `astro.rs` — math helpers | `Shollu.pas:160-300` | XS | ☐ | Most are Rust stdlib (`ceil`, `floor`, `sign`, `IntPart`, `precPart`). Only port what's actually needed. |
| B4 | `places.rs` — `.spn` parser + SQLite migration | `UCities.pas:147-278` | M | ☐ | Build-time tool: read `.spn` files from `F:\dev\projects\shollu\placenames\` → emit `assets/cities.db`. Runtime: query layer + search. See `docs/data-formats.md` for binary format. |
| B5 | `i18n.rs` — `.slp` parser + JSON converter | scattered in `Unit1.pas` | S | ☐ | Build-time tool: read `Languages\*.slp` → emit `assets/lang/<id>.json` with stable string IDs. Runtime: load + lookup. Need to manually map index-numbered items to semantic IDs by cross-referencing `Lang.Items[N]` usage in Pascal. |
| B6 | `settings.rs` — persistence | `Unit1.pas:1180-1280` (`ReadRegistry`, `SaveSetting`) | S | ☐ | TOML at platform-standard location (`%APPDATA%\SholluModern\settings.toml` on Win, `~/Library/Application Support/SholluModern/` on Mac, `~/.config/shollu-modern/` on Linux). Provide one-time Windows registry → TOML migration helper (read `HKLM\Software\Shollu3`). |
| B7 | `scheduler.rs` — task engine | `USchedule.pas` + `UTask.pas` | L | ☐ | Cron-like scheduling. Task types: `Informasi`, `Peringatan`, `Tulisan bergerak`, `Multimedia`, `Command`, `Shutdown`, `Hibernate`, `Pertanyaan`. Frequencies: `Harian`, `Mingguan` (+day), `Bulanan` (+date), `Sekali` (one-shot), `Ketika Start` (on app start). Use `tokio` async + native OS scheduling APIs. |
| B8 | `audio.rs` — adzan playback | `KOLMediaPlayer.pas` (2101 LOC orig) | S | ☐ | Use `rodio` crate. Target ~50 LOC. Supports play / pause / stop, MP3 + WAV + OGG. Includes "dua after adzan" hook. |
| B9 | Tauri commands — expose all of above to frontend | new | S | ☐ | One command per logical user action. Use `serde::Serialize` on return types. Keep commands thin — delegate to modules. |

### Backend Tauri command contract (drafted)

The UI agent needs these. Implement as you port the corresponding module. Names + signatures are suggested — refine as needed but keep the shape stable for the UI.

| Command | Returns | Module | Status |
|---|---|---|---|
| `compute_prayer_times_demo()` | `PrayerTimes` | prayer_times | ☑ done |
| `compute_prayer_times(date_iso, location, method, madhab, adjustments)` | `PrayerTimes` | prayer_times | ☐ extend from demo |
| `convert_gregorian_to_hijri(year, month, day, adjustment)` | `{ year, month, day, weekday }` | hijri | ☐ |
| `convert_hijri_to_gregorian(year, month, day, adjustment)` | `{ year, month, day, weekday }` | hijri | ☐ |
| `qibla_bearing(latitude, longitude)` | `{ degrees, cardinal }` | qibla | ☐ |
| `search_cities(query, limit)` | `Vec<City>` | places | ☐ |
| `list_regions()` | `Vec<Region>` | places | ☐ |
| `cities_by_region(region_id)` | `Vec<City>` | places | ☐ |
| `get_settings()` | `Settings` | settings | ☐ |
| `save_settings(Settings)` | `()` | settings | ☐ |
| `import_legacy_settings()` | `Settings` | settings | ☐ |
| `get_languages()` | `Vec<LanguageMeta>` | i18n | ☐ |
| `get_translations(lang_id)` | `HashMap<String, String>` | i18n | ☐ |
| `list_tasks()` | `Vec<Task>` | scheduler | ☐ |
| `upsert_task(Task)` | `Task` | scheduler | ☐ |
| `delete_task(task_id)` | `()` | scheduler | ☐ |
| `play_adzan(file_path)` | `()` | audio | ☐ |
| `stop_audio()` | `()` | audio | ☐ |

## Phase 3 — UI/UX (handoff to UI agent)

See `docs/UI_HANDOFF.md` for the full brief.

| # | Component | Replaces (legacy) | Effort | Status | Backend deps |
|---|---|---|---|---|---|
| U0 | Theming system — CSS vars, dark/light/sepia + 5 accents | `Skin.RES` + 40 BMP | S | ☐ | none |
| U1 | `<AppShell>` + sidebar nav + router | `Unit1.pas` shell | M | ☐ | none |
| U2 | `<About>` — credit Ebta + license + lang toggle | `UAbout.pas` | XS | ☐ | none |
| U3 | `<MainPage>` — prayer grid + hero countdown + qibla compass | `UMainPage.pas` | M | ☐ | B1, B2, prayer_times |
| U4 | `<LocationSettings>` — lat/lon/method/madhab/adjustments | `UArea.pas` | M | ☐ | B6 |
| U5 | `<CityPicker>` — search + region tree | `UCities.pas` | M | ☐ | B4 |
| U6 | `<HijriConverter>` — dual calendar | `UConvert.pas` | S | ☐ | B1 |
| U7 | `<Settings>` — general preferences | `USettingpas.pas` | L | ☐ | B6 |
| U8 | `<ScheduleView>` — date range + export | `USchedule.pas` | M | ☐ | prayer_times |
| U9 | `<TaskEditor>` — list + form (Pesan tambahan style) | `UTask.pas` | L | ☐ | B7 |
| U10 | `<MessageDialog>` — modal reminder/azan | `UMessage.pas` + `UDialog.pas` | M | ☐ | B7, B8 |
| U11 | `<FloatingBar>` — countdown strip window | `UBar.pas` | S | ☐ | prayer_times |
| U12 | `<DropZone>` — mini always-on-top widget | `UDropZone.pas` | M | ☐ | prayer_times |
| U13 | i18n integration — Solid context + ID/EN switch | `Languages/*.slp` | S | ☐ | B5 |
| U14 | `<Tray>` — system tray icon + popup | `Unit1.pas` tray | S | ☐ | tauri-plugin-tray |
| U15 | a11y pass — keyboard nav, ARIA, contrast | new | S | ☐ | none |

## Phase 4 — Release

| # | Item | Effort | Status | Notes |
|---|---|---|---|---|
| R1 | First MVP: P0 done + U0 + U1 + U2 + U3 + U4 + U5 + U14 | — | ☐ | Functional prayer-time app |
| R2 | Code signing — Windows Authenticode + macOS notarization | M | ☐ | Requires certs (Sectigo for Win, Apple Dev for Mac) |
| R3 | First public release v0.1.0-alpha + changelog | S | ☐ | GitHub Release + binaries |
| R4 | Courtesy outreach to Ebta Setiawan | XS | ☐ | Email letting him know the project exists. Optional but kind. |

---

## Effort summary

- **Phase 1 (infra):** ~5-10 hours
- **Phase 2 (backend B1-B9):** ~50-80 hours
- **Phase 3 (UI U0-U15):** ~60-90 hours (handed off to UI agent)
- **Phase 4 (release):** ~15-25 hours
- **Total:** 130-205 hours ≈ 3-5 weeks focused, 8-12 weeks casual.

## Update protocol

Whenever you complete an item, change its status `☐ → ☑` and add a short note (date + commit hash if helpful). Add new items as discovered.
