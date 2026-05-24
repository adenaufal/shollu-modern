# Shollu Modern (English Edition)

[Baca dalam Bahasa Indonesia (Read in Indonesian) 🇮🇩](./README.md)

A modern, cross-platform revival of [Shollu](https://github.com/ebta/shollu) — the beloved desktop prayer times reminder for Muslims originally created by **Ebta Setiawan** (2004–2012). 

This rebuild preserves 100% of the legacy calculations, binary places databases, language packs, and cron task schedulers, modernizing the visual layer for contemporary systems.

> **Status:** MVP `v0.1.0-alpha` completed & fully operational! Verified with 0 Clippy warnings and 100% passing Cargo test suites across Windows, macOS, and Linux.

---

## Why This Exists

The original **Shollu v3.10** was an incredibly lightweight (~276 KB) prayer-times app for Windows, built in Delphi using the KOL toolkit. It was used and loved by a generation of Indonesian Muslims. After 14 years without updates, it still runs but lacks native macOS/Linux support and feels out of place on modern systems. 

**Shollu Modern** brings all of its features forward into a high-performance desktop framework with a premium, responsive user interface. It preserves the exact spirit of the original: lightweight, focused, 100% offline-capable, and completely free of telemetry, tracking, or ads.

The original work and its author Ebta Setiawan are prominently credited. See [ATTRIBUTION.md](ATTRIBUTION.md).

---

## Completed Features (Parity with Original)

- **Prayer Calculations** (`prayer_times.rs`): Mapped the 5 traditional calculation methods (ISNA, Karachi, Muslim World League, Umm Al-Qura, Egypt General Authority) and matched legacy Pekanbaru times.
- **Qibla Compass** (`qibla.rs`): Spherical Mecca bearing calculations with cardinal direction mapping and smooth rotational SVG compass needles.
- **Bilingual Interface**: High-fidelity SolidJS localization matching the original's legacy `.slp` translation files, supporting English and Bahasa Indonesia toggles on-the-fly.
- **City Autocomplete Picker** (`places.rs`): Ported the original binary `.spn` place databases to a local SQLite structure. Includes real-time autocomplete searching for 10,000+ administrative regions, automatically filling in coordinates and timezone offsets.
- **Calendar Converters** (`hijri.rs`): Julian Day conversions between Gregorian and Hijri calendars, with offsets calibrations.
- **Task Scheduler** (`scheduler.rs`): Cron-like async engine checking trigger criteria, displaying warning modals, launching command scripts, playing adzan MP3 audio via thread-safe CPAL/Rodio playbacks, and handling PC power states (Shutdown/Hibernate).
- **Premium Themes & Accents**: Standard-compliant styling loaded with 3 theme modes (`light`, `dark`, and a warm, eye-friendly `sepia` parchment) and 5 accent dots selectors (`teal` (brand), `indigo`, `emerald`, `rose`, `slate`).
- **Tabular Numerals**: Countdown clock displays utilize `font-variant-numeric: tabular-nums` to ensure zero layout shifts during ticking.
- **Multi-Window Overlay Widgets**:
  - **U11 `<FloatingBar>`**: A draggable, borderless horizontal info strip showing ticking count clocks and compact schedules.
  - **U12 `<DropZone>`**: A draggable, edge-snapping mini square overlay count clock widget.
- **System Tray**: Wires system tray toggles in the sidebar footer and Settings page.
- **Settings Persistence** (`settings.rs`): Fully persisted cross-platform TOML configurations mapping startup loads.

---

## Tech Stack

- **Tauri 2** (Rust backend core & WebView window runner)
- **SolidJS** + **TypeScript** (High-precision frontend components)
- **Tailwind CSS v4** (Modern utility styles)
- **SQLite** (Fast, local relational city queries)

---

## Local Development & Compilation (Offline)

### Prerequisites
Make sure you have Node.js 20+, `pnpm`, and the Rust toolchain (`cargo`, `rustup`) configured.

```bash
# Clone the repository
git clone https://github.com/adenaufal/shollu-modern.git
cd shollu-modern

# Install JS dependencies
pnpm install

# Run in development mode (live-reload active)
pnpm tauri dev

# Compile optimized standalone offline installer (.exe / .msi on Windows)
pnpm tauri build
```

The compiled binaries will be output at `src-tauri/target/release/`.

---

## License

Shollu Modern is licensed under the [PolyForm Noncommercial 1.0.0 License](LICENSE.md) — completely free for personal, educational, religious, and non-commercial community use. Commercial exploitation is strictly prohibited.

---

## Credits & Attributions

- **Ebta Setiawan** — the pioneering author of the original Shollu app (2004-2012). Without his software, this modernization project would not exist.
- The Indonesian and global Muslim developer community who used, supported, and loved Shollu for nearly two decades.
- Contributed and maintained by **adenaufal** (Ade Naufal Ammar).
