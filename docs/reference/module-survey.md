# Module Survey — Legacy Mapping and Current v1

This document began as a Pascal-to-Rust/SolidJS migration plan. The table below preserves the source mapping while recording the state of the working v1 app as of September 30, 2026. Current behavior is defined by `src/` and `src-tauri/src/`; estimates and implementation suggestions are historical planning notes.

## Rust backend

| Current area | Legacy source / original proposal | Current v1 behavior |
|---|---|---|
| `prayer_times.rs` | `Shollu.pas:408-472` (`GetPrayerTime`) | Calculates six daily times using the legacy Spencer-based formula, five named methods plus custom angles, madhab, and minute adjustments. The UI exposes the five named methods; custom angles are accepted by the calculation command/API. |
| `hijri.rs` | `Shollu.pas:301-379` (`ConvertDate`) | Converts Gregorian and Hijri dates using the ported integer arithmetic, including user adjustment. |
| `qibla.rs` | `UMainPage.pas:179-188` (`QiblaAngle`) | Calculates a normalized great-circle bearing with input validation and cardinal direction. |
| `places.rs` | `UCities.pas:147-278` (`LoadFirst`, `LoadAdmName`) | Parses bundled `.spn` resources, initializes local SQLite place data, and supports city search. |
| `i18n.rs` | `.slp` loader and `Unit1.pas` references | Loads bundled legacy language packs; the app currently ships Indonesian and English UI alongside other included language resources. |
| `settings.rs` | `Unit1.pas:1180-1280` (`ReadRegistry`, `SaveSetting`) | Stores app settings as TOML in `settings.toml` under `dirs::config_dir()/SholluModern` (overridable with `SHOLLU_CONFIG_DIR`), with validation and atomic file replacement. No legacy registry import. |
| `scheduler.rs` | `USchedule.pas` + `UTask.pas` | Handles prayer schedule and reminder/task behavior in Rust; see the module for supported actions and platform hooks. |
| `audio.rs` | `KOLMediaPlayer.pas` | Plays bundled audio resources through the current native audio implementation. Seven files are bundled: four adhan recordings and three short supplication/phrase tracks. Basmalah and hamdallah runtime use remains pending issue 45. |
| `astro.rs` | Helpers in `Shollu.pas` | Shared date/math support used by the port. |

## SolidJS frontend

| Current area | Legacy source / original proposal | Current v1 behavior |
|---|---|---|
| `MainPage` | `UMainPage.pas` | Daily prayer times, next-prayer countdown, location/date summary, and Qibla bearing/compass. |
| `LocationPage` | `UArea.pas`, `UCities.pas` | Location coordinates, timezone, altitude, calculation method, madhab, adjustments, and searchable bundled city data. |
| `SchedulePage` | `USchedule.pas` | Date-based prayer schedule with CSV export. |
| `TasksPage` | `UTask.pas`, `UMessage.pas` | Reminder/task configuration and supported notification/audio actions. |
| `ConvertPage` | `UConvert.pas` | Gregorian/Hijri conversion with adjustment. |
| `SettingsPage` | `USettingpas.pas` | Language, appearance, audio, startup, and window/widget preferences supported by the current settings model. |
| `AboutPage` | `UAbout.pas` | App version and original author attribution. |
| `FloatingBar`, `DropZone` | `UBar.pas`, `UDropZone.pas` | Optional compact floating windows controlled by app settings. |
| App shell | `Unit1.pas` navigation/tray code | Seven-page navigation, Tenang/Ringkas layouts, command palette, notices, tray integration, and native window handling. |

## Historical proposal items

The old plan suggested build-time `.slp` to JSON conversion, `.spn` to a designed SQLite schema, settings migration from the Windows Registry, `rodio` or an audio plugin, and extra floating-window behavior. These are proposals from the migration period, not descriptions of current behavior. Refer to the current source modules for the implementation details.

## Verification and release context

The working v1 is version **1.0.0** on `main`, user-tested and working as of September 30, 2026. The project reports 38 Rust tests, 6 frontend tests, and 17 native Windows test groups, with CI configured for three operating systems. A public v1 release and signed release artifacts have not been published yet. See the root README and release notes for current distribution status.
