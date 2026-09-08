# Module Survey — Mapping Pascal to Rust/Solid

A module-by-module migration plan, with effort estimates and notes on what the Rust backend handles vs. what the SolidJS frontend handles.

## Backend (Rust, in `src-tauri/src/`)

| New module | Replaces (Pascal) | Lines (orig) | Effort | Notes |
|---|---|---|---|---|
| `prayer_times.rs` | `Shollu.pas:408-472` (`GetPrayerTime`) | ~70 | S | Already drafted ([prayer-times-draft.rs](prayer-times-draft.rs)). Pure math, easy port. |
| `hijri.rs` | `Shollu.pas:301-379` (`ConvertDate`) | ~80 | S | Algorithm is integer arithmetic; trivial port. |
| `qibla.rs` | `UMainPage.pas:179-188` (`QiblaAngle`) | ~15 | XS | One function. Spherical bearing toward Mecca. |
| `places.rs` | `UCities.pas:147-278` (`LoadFirst`, `LoadAdmName`) | ~130 | M | Replace .spn binary reader with SQLite query layer. See [data-formats.md](data-formats.md). |
| `i18n.rs` | language `.slp` loader scattered through `Unit1.pas` | ~50 | S | Replace with serde + JSON. Build-time conversion of `.slp` to JSON. |
| `settings.rs` | `Unit1.pas:1180-1280` (`ReadRegistry`, `SaveSetting`) | ~100 | S | Use `serde` + `toml`; Tauri store plugin. Provide Windows registry → TOML migration helper. |
| `scheduler.rs` | `USchedule.pas` + `UTask.pas` task execution | ~600 | L | Cron-like scheduling. Use `tokio` async + native OS scheduling APIs. |
| `audio.rs` | `KOLMediaPlayer.pas` (2101 lines) | ~50 | S | Use Tauri's audio plugin or `rodio` crate. Original is huge because it bundles its own MCI wrapper; modern crates handle this in 50 LOC. |
| `astro.rs` | math helpers in `Shollu.pas` | ~30 | XS | `ceil`, `floor`, `sign`, etc. Most are in Rust stdlib. |

## Frontend (SolidJS, in `src/`)

| New component | Replaces (Pascal) | Lines (orig) | Effort | Notes |
|---|---|---|---|---|
| `<MainPage>` | `UMainPage.pas` | 271 | M | Prayer times grid (yesterday/today/tomorrow), qibla compass, location info card. Compass = inline SVG instead of `Canvas.Pixels` raster. |
| `<Settings>` | `USettingpas.pas` | 519 | L | General preferences: theme, language, audio, format, autostart, etc. |
| `<LocationSettings>` | `UArea.pas` | 348 | M | Lat/long/altitude/method/madhab/adjustments. Searchable city picker. |
| `<CityPicker>` | `UCities.pas` | 335 | M | Combobox region → list cities → click to apply. Backed by SQLite. |
| `<ScheduleView>` | `USchedule.pas` | 361 | M | View prayer schedule for date range. Export to CSV/JSON/HTML. |
| `<TaskEditor>` | `UTask.pas` | 526 | L | Scheduled task list + per-task editor (type, frequency, action, message, multimedia). |
| `<HijriConverter>` | `UConvert.pas` | 247 | S | Date converter with calendar widget. |
| `<MessageDialog>` | `UMessage.pas` + `UDialog.pas` | ~700 | M | Modal reminder / azan notification dialog. Triggered by scheduler. |
| `<FloatingBar>` | `UBar.pas` | 291 | S | Compact horizontal strip with countdown to next prayer. Borderless Tauri window. |
| `<DropZone>` | `UDropZone.pas` | 417 | M | Mini always-on-top widget. Borderless Tauri window with custom shape. |
| `<About>` | `UAbout.pas` | 126 | XS | Static page; prominent Ebta Setiawan credit. |
| `<Tray>` (logic) | `Unit1.pas` tray code | ~200 | S | System tray icon + popup menu. Use `tauri-plugin-tray`. |

## Not migrated (replaced by stack/platform)

| Pascal | Reason |
|---|---|
| `HeapMM.pas` | Delphi-specific memory manager. Rust's allocator is the equivalent. |
| `UColConv.pas` | Custom RGB/HLS converter, was used for theme palette. Replaced by CSS HSL variables. |
| `Unit1.pas` skin loader (`LoadBmpTop` + 40 BMP resources) | Replaced by CSS theme system. The 40 colour variants become Tailwind theme tokens. |
| `Unit1.pas` window rounded-corner / region code | Modern OS handle window styling natively. |
| `KOLMediaPlayer.pas` (2101 lines) | Modern audio crates (`rodio`, Tauri audio plugin) cover the use case in ~50 LOC. |

## Effort legend

- **XS:** under 1 hour
- **S:** 1-4 hours
- **M:** 4-16 hours (a couple of focused sessions)
- **L:** 16+ hours (a week of focused work)

## Suggested implementation order

1. **Backend foundations** (1-2 days): `prayer_times.rs`, `hijri.rs`, `qibla.rs`, `astro.rs`, `i18n.rs`, `settings.rs`. Validated by unit tests against the original Shollu3.exe outputs.
2. **Data migration** (1 day): convert `.slp` → JSON, `.spn` → SQLite. Build-time scripts.
3. **Frontend shell** (1-2 days): Tauri scaffold, routing, theme system, layout shell with nav.
4. **MVP screens** (1 week): `<MainPage>`, `<LocationSettings>`, `<CityPicker>`, `<About>`, `<Tray>`. Enough to be a functional prayer-time app.
5. **Notification + audio** (2-3 days): `audio.rs`, `<MessageDialog>`, OS notifications, scheduler hook for adzan playback.
6. **Calendar + schedule** (3-4 days): `<HijriConverter>`, `<ScheduleView>`.
7. **Power features** (1-2 weeks): `<TaskEditor>`, scheduler engine, `<FloatingBar>`, `<DropZone>`.
8. **Polish** (open-ended): themes, animations, packaging, auto-update, signed builds.

**Rough total to MVP (steps 1-5):** 2-3 weeks of focused work.
**Rough total to feature parity (steps 1-8):** 6-10 weeks.
