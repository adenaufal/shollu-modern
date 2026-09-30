# Changelog

All notable changes to the **Shollu Modern** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Documentation
- Refresh both READMEs, contribution/setup instructions, agent context, reference/design archives, and release status for the user-verified v1 baseline.
- Record personal testing first and future signing automation when public distribution is requested.

## [1.0.0] — 2026-09-30

Application/source baseline, confirmed working by the user on Windows. This heading does not indicate a published GitHub Release; public distribution is deferred.

### Added
- Tenang and Ringkas display modes recreated from the design handoff, with shared settings, a command palette, keyboard shortcuts, and offline fonts.
- Live location previews with save/revert, a 42-cell prayer calendar, monthly ledgers, selected-day inspectors, and native CSV/HTML/text exports.
- Per-prayer adhan switches, reminder editing, native desktop notifications, and persistent floating-bar/drop-zone visibility.
- Isolated desktop verification through `SHOLLU_CONFIG_DIR`, frontend unit tests, and a Windows smoke script that exercises real Tauri commands.
- Original Shollu3 adhan recordings mapped to the five prayers, followed by `dua.mp3`, with bundled/custom audio previews and a reset to bundled defaults.
- Basmallah and hamdallah recordings preserved for future behavior tracked in [issue #45](https://github.com/adenaufal/shollu-modern/issues/45).
- Local Windows Authenticode signing instructions and an optional signing configuration example.

### Fixed
- Qibla bearings across quadrants and validation of coordinates, calendar dates, task inputs, and audio paths.
- Hijri adjustment round trips, city-timezone prayer reminders, local-time custom reminders, and once/start reminder persistence.
- Atomic settings/task writes, runtime application of window settings, and bundled offline city/language resources.
- Window routing and invalid-coordinate handling from PRs #28 and #25.

### Release notes
- Windows NSIS installer built locally at about 8.10 MiB with all seven original MP3s and license notices. It remains unsigned Authenticode for personal testing.
- Verification baseline: 38 Rust tests, a separate release resource-resolution test, 6 frontend tests, 17 native Windows smoke groups, and passing CI on Windows/macOS/Linux. Native UI testing outside Windows remains future work.
- PRs [#25](https://github.com/adenaufal/shollu-modern/pull/25), [#28](https://github.com/adenaufal/shollu-modern/pull/28), [#44](https://github.com/adenaufal/shollu-modern/pull/44), and [#46](https://github.com/adenaufal/shollu-modern/pull/46) are merged.
- Public signing automation is planned when requested; see [the distribution note](docs/release/windows-local-signing.md).
- See [v1.0 guide](docs/V1.md) for verification, packaging, keyboard shortcuts, and platform limits.

## [0.1.0-alpha] — 2026-05-24

Historical development milestone for the initial Rust/SolidJS/Tauri implementation. The entries below describe the alpha-era work, not the current v1 interface or proof of a publicly downloadable release.

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
- **SQLite Places migration** (`places.rs`): Decoded original `.spn` place records and imported them into SQLite.
- **SLP language parser** (`i18n.rs`): Raw binary parsing to import legacy language files and convert them to JSON.
- **Task engine** (`scheduler.rs`): Cron-like async execution loop handling info alerts, command execution, and PC power management.
- **Audio players** (`audio.rs`): Multi-format audio output through a dedicated CPAL/Rodio worker thread.

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
