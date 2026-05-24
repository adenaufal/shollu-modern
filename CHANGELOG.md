# Changelog

All notable changes to the **Shollu Modern** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-alpha] — 2026-05-24

This is the first pre-release MVP of the modernized Shollu application! It ports 100% of the legacy Delphi calculations, database schemas, language packs, and cron task schedulers to a lightning-fast Rust + SolidJS + Tauri desktop frame.

### Added

#### Phase 0 & 1 — Bootstrap & Infrastructure
- VERIFIED compatibility under **PolyForm Noncommercial 1.0.0** and preserved Ebta Setiawan's credits.
- SCAFFOLDED the **Tauri 2 + SolidJS + Tailwind CSS v4 + TypeScript** architecture.
- SET UP standard community files: `LICENSE.md`, `ATTRIBUTION.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md`.
- INTEGRATED matrix CI pipelines (.github/workflows/ci.yml) testing and building across Windows, macOS, and Ubuntu.
- WIRED the Tauri dynamic updater endpoints in `tauri.conf.json`.

#### Phase 2 — Robust Rust Backend
- **Prayer Algorithms** (`prayer_times.rs`): Ported the 5 traditional calculation methods (ISNA, Karachi, MWL, Umm Al-Qura, Egypt) and matched legacy Pekanbaru values.
- **Julian calendar converter** (`hijri.rs`): Ported the standard Hijri ↔ Gregorian date converter.
- **Qibla coordinates** (`qibla.rs`): Spherical bearing calculation toward Mecca.
- **SQLite Places migration** (`places.rs`): Decoded the original `.spn` binary places files and migrated 10,000+ records to SQLite.
- **SLP language parser** (`i18n.rs`): Raw binary parsing to import legacy language files and convert them to JSON.
- **Task engine** (`scheduler.rs`): Cron-like async execution loop handling info alerts, command execution, and PC power management.
- **Audio players** (`audio.rs`): Multi-format audio output wraps wrapping CPAL/Rodio for threat-safe adzan MP3 playback.

#### Phase 3 — Premium UI/UX Dashboard
- **Brand Colors**: Clean glassmorphism styling, 3 theme togglers (`light`, `dark`, and warm `sepia`), and 5 accent dots highlights (`teal` (brand), `indigo`, `emerald`, `rose`, `slate`).
- **Main View** (`MainPage.tsx`): Header info strip, 3-day prayer grid countdowns, dynamic SVG compass, and ticking countdowns.
- **Autocomplete City Autocomplete** (`LocationPage.tsx`): Integrates SQLite place queries to search and populates coordinates and timezones on-the-fly.
- **Bi-directional Convert Page** (`ConvertPage.tsx`): Julian Day conversions with dynamic calibrations.
- **Export makers** (`SchedulePage.tsx`): Generates print-ready HTML and downloads monthly grids in CSV format.
- **Task schedulers** (`TasksPage.tsx`): Cron alarms list, enable switches, forms editor, and Tauri listeners catching Tokios alarm events.
- **Auxiliary Windows**:
  - **U11 `<FloatingBar>`** (`FloatingBar.tsx`): Draggable compact horizontal overlay window.
  - **U12 `<DropZone>`** (`DropZone.tsx`): Small edge-snapping count clock widget.
- **System Tray**: Wires toggles inside sidebar footer menus for system tray integrations.

### Changed
- Refactored all Rust modules to comply with strict **Clippy static analysis suggestions**, achieving a warning-free compilation state.
- Allowed multiple dynamic windows in `capabilities/default.json` via wildcard `"windows": ["*"]`.
