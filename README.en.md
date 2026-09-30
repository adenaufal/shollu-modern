# Shollu Modern

[Baca dalam Bahasa Indonesia](README.md)

A desktop prayer reminder rebuilt from **[Shollu](https://github.com/ebta/shollu)** by **Ebta Setiawan** (2004–2012), using Rust, Tauri 2, and SolidJS.

**Status as of September 30, 2026:** application version **1.0.0** is on `main` and the user has confirmed it works on Windows. A local Windows installer has been built. Public distribution and signing are deferred until the user is ready to share it; no v1 installer has been published on GitHub Releases.

[v1 guide (Indonesian)](docs/V1.md) · [Documentation](docs/README.md) · [Changelog](CHANGELOG.md) · [Roadmap](docs/ROADMAP.md)

## Interface

**Tenang** uses an icon rail, countdown cards, and a day arc. **Ringkas** uses tabs, a monthly schedule ledger, an inspector, and a status bar. Both follow the `design_handoff_shollu_ui` handoff and share settings and schedules.

![Tenang mode](docs/screenshots/tenang-main.png)

![Ringkas mode](docs/screenshots/ringkas-main.png)

## v1 features

- Five prayer calculation methods: ISNA, Karachi, Muslim World League, Umm Al-Qura, and Egypt; Asr options, rounding, and minute adjustments.
- Offline city search from the original `.spn` databases imported into local SQLite, location previews before saving, and a Qibla compass. The timezone is a user-selected fixed UTC offset; original city data does not contain timezones or daylight-saving rules.
- Monthly calendars, selected-day details, native CSV/HTML/TXT export, and Gregorian–Hijri conversion with −1/0/+1 day adjustments.
- Custom reminder creation/editing/deletion and enable switches, plus per-prayer adhan settings. Custom reminders use the computer's clock; prayer reminders use the selected location's timezone.
- Bundled original Shollu3 adhan recordings, dua after adhan, per-prayer previews, custom audio files, and a reset to bundled recordings.
- Indonesian/English, three themes (light, dark, sepia), five accents, and bundled offline fonts.
- System tray, floating bar, drop zone, always-on-top, autostart, and local settings persistence. Prayer schedules, city search, and bundled audio work without internet once installed.

### Adhan recordings

| Prayer | Bundled recording |
| --- | --- |
| Fajr | `azan-fajr.mp3` |
| Dhuhr and Isha | `azan-mecca.mp3` |
| Asr | `azan-egypt.mp3` |
| Maghrib | `azan-dammam.mp3` |

`dua.mp3` follows the adhan in the same queue. Stop cancels both. A custom file overrides the adhan recording for all prayers and still precedes dua. Sunrise never triggers adhan. `basmallah.mp3` and `hamdallah.mp3` are included, with runtime behavior deferred in [issue #45](https://github.com/adenaufal/shollu-modern/issues/45). Provenance and original license notices are documented in [the audio directory](src-tauri/audio/README.md).

## Try or build the application

For personal testing, use a locally built Windows installer. Signing is not required for private testing. NSIS packages are output to `src-tauri/target/release/bundle/nsis/`; the latest local installer is about **8.10 MiB** and has no Authenticode signature.

### Development prerequisites

- Node.js **22.x ≥ 22.13.0** and **pnpm 11**; CI uses Node 22.13.0.
- Stable Rust and native Tauri tooling: Windows needs C++ Build Tools, Windows SDK, and WebView2; macOS needs Xcode Command Line Tools; Linux needs WebKitGTK, tray indicator, and ALSA packages.
- System dependencies and contribution instructions: [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
git clone https://github.com/adenaufal/shollu-modern.git
cd shollu-modern
pnpm install --frozen-lockfile
pnpm tauri dev
```

Dependency installation and the initial build require internet access. `pnpm dev` runs only the frontend; desktop functionality requires the Tauri runtime.

To create a local Windows installer without signed updater artifacts, run in PowerShell:

```powershell
pnpm tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

When public distribution is requested, signing will be automated as one command or a CI workflow after selecting a certificate/provider. See [the local signing guide and distribution note](docs/release/windows-local-signing.md).

## Verification

```sh
pnpm test
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --lib -- -D warnings
```

The v1 baseline has **38 Rust tests**, **6 frontend tests**, TypeScript/production build checks, Clippy with warnings denied, and **17 Windows desktop smoke groups** against the release application and real Tauri IPC. CI checks frontend and Rust on Windows, macOS, and Linux. Native interaction testing and user confirmation took place on Windows; CI does not replace native UI testing on the other platforms. Shutdown/hibernate actions are not executed by the smoke test.

See [the v1 guide](docs/V1.md) for `pnpm test:desktop`, isolated configuration, and keyboard shortcuts.

## License and credits

Shollu Modern uses [PolyForm Noncommercial 1.0.0](LICENSE.md). Usage and contributions must respect its noncommercial terms and the original notices.

- **Ebta Setiawan** — original Shollu author; its algorithms, databases, language packs, distribution recordings, and heritage remain credited in [ATTRIBUTION.md](ATTRIBUTION.md).
- **adenaufal** (Ade Naufal Ammar) — Shollu Modern maintainer.
- The Shollu user and contributor community.
