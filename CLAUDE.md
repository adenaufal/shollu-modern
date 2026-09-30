# CLAUDE.md — Shollu Modern

This file orients Claude Code (and other AI assistants) to the project. Read it first.

## What is this

**Shollu Modern** is a community-driven modernization of [Shollu](https://github.com/ebta/shollu), the Indonesian prayer-times reminder app originally created by **Ebta Setiawan** (2004-2012, Delphi + KOL, ~276 KB Windows .exe). The original was last updated 14 years ago.

Version 1.0.0 implements the core prayer-time, Qibla, calendar, reminder, audio, tray, and overlay workflows in the Tenang/Ringkas UI. The user has confirmed personal Windows testing works. CI checks Windows, macOS, and Linux; native UI verification has been performed on Windows. Public distribution and signing are deferred.

**License:** [PolyForm Noncommercial 1.0.0](LICENSE.md) — non-commercial use only, derived from the original Shollu's non-commercial OSS license. See [ATTRIBUTION.md](ATTRIBUTION.md) for heritage details.

## Stack

- **Backend:** Rust + Tauri 2 (`src-tauri/`)
- **Frontend:** SolidJS + TypeScript (`src/`)
- **Styling:** Tailwind CSS v4 plus scoped shell/prayer/utility CSS
- **Package manager:** pnpm 11
- **Latest local Windows NSIS installer:** about 8.10 MiB including original audio; unsigned Authenticode
- **Target platforms:** Windows, macOS, Linux (mobile out of scope)

Declared dependency ranges: `package.json` + `src-tauri/Cargo.toml`. Resolved dependencies: `pnpm-lock.yaml` + `src-tauri/Cargo.lock`. CI uses Node 22.13.0 and pnpm 11; use Node 22.x ≥22.13.0 for local development.

## Commands

> On this development workstation, initialize the custom Rust directories before using Cargo:
>
> ```powershell
> $env:CARGO_HOME = 'F:\dev\.cargo'
> $env:RUSTUP_HOME = 'F:\dev\.rustup'
> $env:Path = 'F:\dev\.cargo\bin;' + $env:Path
> ```

```bash
# Install resolved dependencies from the repository lockfile
pnpm install --frozen-lockfile

# Run dev mode (Vite dev server + Rust hot-reload + desktop window)
pnpm tauri dev

# Frontend only — Vite dev server on http://localhost:1420
pnpm dev

# Build frontend (production, outputs to dist/)
pnpm build

# Build a local Windows installer without updater signing credentials
pnpm tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}'

# Frontend regression tests and standalone type check
pnpm test
pnpm typecheck

# Run Rust unit tests
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --lib -- -D warnings

# Print prayer-time reference table for sanity-checking
cd src-tauri && cargo test --lib print_reference_table -- --nocapture
```

## File structure

```
shollu-modern/
├── CLAUDE.md                  ← you are here
├── README.md                  Project intro for humans
├── LICENSE.md                 PolyForm Noncommercial 1.0.0
├── ATTRIBUTION.md             Credit to Ebta + heritage + license compatibility
├── CONTRIBUTING.md            Contribution guide (noncommercial scope)
├── CODE_OF_CONDUCT.md         Contributor Covenant 2.1
├── CHANGELOG.md               v1 baseline and earlier alpha history
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        (esbuild build approval)
├── .npmrc
├── .gitattributes
├── .gitignore
├── index.html
├── tsconfig.json, tsconfig.node.json
├── vite.config.ts             Vite + Solid + Tailwind v4
├── tests/                     Frontend regression cases (Vitest)
├── scripts/                   Real Windows desktop smoke + native dialog helper
├── docs/                      ← index: docs/README.md; current guide: docs/V1.md
│   ├── ROADMAP.md             Phased action plan; check status here
│   ├── UI_HANDOFF.md          Brief for UI/UX agent
│   ├── original-license.txt   Verbatim from Ebta's distribution (load-bearing)
│   ├── reference/             prayer-time-algorithm, data-formats, module-survey, ui-design
│   ├── release/               code-signing, courtesy-outreach, walkthrough
│   └── design-system/         Historical tokens/previews/prototype; see current handoff context
├── public/                    Static assets served by Vite (icons, logo)
├── src/                       SolidJS frontend
│   ├── App.tsx
│   ├── App.css                Tailwind v4 + fonts/theme tokens
│   ├── shell.css              Tenang/Ringkas shell
│   ├── state.tsx              Shared settings, preview, clock, prayer cache, save queue
│   ├── index.tsx
│   ├── helpers.ts             Time formatting + localization helpers
│   ├── components/            One PascalCase.tsx per page + overlays (FloatingBar, DropZone, QiblaCompass, Icons)
│   └── assets/
└── src-tauri/                 Rust backend
    ├── Cargo.toml, Cargo.lock
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/
    ├── icons/
    ├── audio/                 Seven original Shollu3 MP3s and original notices
    ├── Languages/*.slp        Original Shollu language packs (7 files)
    ├── placenames/*.spn       Original binary place databases
    └── src/
        ├── main.rs
        ├── lib.rs             Tauri runtime + command registration
        ├── prayer_times.rs    Ported from Shollu.pas:408-472
        ├── astro.rs           Math helpers (Shollu.pas:160-300)
        ├── hijri.rs           Hijri ↔ Gregorian (Shollu.pas:301-379)
        ├── qibla.rs           Qibla bearing (UMainPage.pas:179-188)
        ├── places.rs          .spn parser + SQLite (UCities.pas)
        ├── i18n.rs            .slp parser (Unit1.pas)
        ├── settings.rs        TOML persistence (Unit1.pas registry)
        ├── scheduler.rs       Task engine (USchedule.pas + UTask.pas)
        └── audio.rs           Adzan playback via CPAL/Rodio
```

The original Pascal source lives at `F:\dev\projects\shollu\` (sibling folder) as a read-only reference. Don't modify it.

## Conventions

### Code style

- **Rust:** `cargo fmt` defaults. CI gates formatting and Clippy with warnings denied.
- **TypeScript:** Prettier defaults. Single quotes, no semicolons optional, trailing commas. Run `pnpm exec prettier --write src/` if installed; otherwise just follow existing files.
- **Tailwind:** Compose utilities over writing custom CSS. Use `@theme` in `App.css` for design tokens (already set up). Dark mode via `dark:` variant.
- **Imports:** Group + sort: std lib → external crates → internal modules. For TS: Solid → external → internal. No deep relative paths beyond `../`.

### Commits

- Short imperative subject under 70 chars (e.g., `port hijri converter from Shollu.pas:301`).
- Body when needed: what + why + reference to source file/line if relevant.
- Reference the original module being ported: `Shollu.pas:301-379` style.

### Naming

- Rust modules: `snake_case` (e.g., `prayer_times`, `hijri`)
- Solid components: `PascalCase` (e.g., `MainPage.tsx`, `CityPicker.tsx`)
- Tauri commands: `snake_case` (e.g., `compute_prayer_times`, `convert_hijri_date`)

### Tests

- Rust: `#[cfg(test)] mod tests` in each module. Include at least one reference test against original Shollu3.exe output with ±60s tolerance. See `prayer_times::tests::validate_pekanbaru_against_shollu3` for the pattern.
- TypeScript: Vitest through `pnpm test`; `pnpm build` includes strict type checking.
- Native Windows: `pnpm test:desktop` exercises real Tauri IPC and isolated configuration. See `docs/V1.md` for debug/release setup. Do not execute destructive shutdown/hibernate actions during smoke tests.

## Non-negotiable rules

These are baked in. Don't violate them without explicit user authorization.

1. **Attribution to Ebta Setiawan stays.** README, ATTRIBUTION.md, About page, in-code `// derived from Shollu.pas:NNN by Ebta Setiawan` comments — none of this is removed or watered down. The Indonesian license text says "Bagi yang ingin mengembangkannya kami persilahkan" — we honor that by keeping his name prominent.

2. **License stays PolyForm Noncommercial 1.0.0.** Don't relicense to MIT/Apache/GPL. The original Shollu prohibits commercial use; any derivative inherits that.

3. **Don't rename the project away from "Shollu Modern" without user say-so.** If a trademark issue arises later, that's a separate conversation.

4. **Don't bundle commercial integrations.** No paid services, no ads, no telemetry, no analytics, no subscription gates.

5. **Don't delete `docs/original-license.txt` or `ATTRIBUTION.md`.** They're load-bearing for licensing compliance.

## Current state (2026-09-30)

- Application version 1.0.0 is on `main`; the user has confirmed it works for personal Windows use.
- All seven pages, shared Tenang/Ringkas state, calendars/export, reminders, location preview, themes/language, tray, and native overlays are implemented. Default window: 960×660; minimum: 600×480.
- Original Shollu3 audio is bundled: Fajr uses `azan-fajr.mp3`, Dhuhr/Isha `azan-mecca.mp3`, Asr `azan-egypt.mp3`, Maghrib `azan-dammam.mp3`; `dua.mp3` follows adhan. Custom files remain a global adhan override. Basmallah/hamdallah are copied only; runtime behavior is tracked in issue #45.
- Verification baseline: 38 Rust tests, a separate release resource-resolution check, 6 frontend tests, strict build/type/format/Clippy checks, and 17 native Windows smoke groups. CI passes on Windows/macOS/Linux; native testing on the other platforms remains future work.
- PRs #25, #28, #44, and #46 are merged. No v1 GitHub Release or public signed installer has been published; local installer is unsigned. Existing alpha documents are historical, not evidence of a downloadable release.
- Courtesy outreach is drafted and unsent. Original attribution and license notices remain.

See `docs/ROADMAP.md` for the phased action plan and current status of each item.

## Next priorities (in order)

1. **Personal testing:** collect v1 feedback from the user's current Windows use.
2. **Deferred sounds:** define and implement basmallah/hamdallah triggers when requested ([issue #45](https://github.com/adenaufal/shollu-modern/issues/45)).
3. **Public distribution, when requested:** select a signing certificate/provider, then automate build → application signing → installer signing/timestamp → verification/checksums in one command or CI. Handle Tauri updater signatures separately; see `docs/release/windows-local-signing.md`. Do not publish a release merely because the code is versioned 1.0.0.
4. **Other platforms and outreach:** native macOS/Linux verification and courtesy communication when explicitly authorized. A draft email is not permission to send it.

## Working with the user

The user is **adenaufal** (Ade Naufal Ammar) — Indonesian dev, Windows 11, casual ID/EN code-switching. Match the tone. They value:

- Concrete recommendations with trade-offs spelled out
- Step-by-step pacing (don't dump 5 changes at once)
- Honest attribution + ethical handling of forks
- Compact tables over walls of prose

When unsure, propose with reasoning + ask. See `memory/user_langk.md` if available.

## Related references

- Original Shollu source: `F:\dev\projects\shollu\` (read-only)
- Original GitHub mirror: <https://github.com/ebta/shollu>
- Original site: <https://ebsoft.web.id>
- Original Google Code Archive: <https://code.google.com/archive/p/shollu>
- Author email (for courtesy notice): <ebta.setiawan@gmail.com>
