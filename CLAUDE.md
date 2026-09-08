# CLAUDE.md — Shollu Modern

This file orients Claude Code (and other AI assistants) to the project. Read it first.

## What is this

**Shollu Modern** is a community-driven modernization of [Shollu](https://github.com/ebta/shollu), the Indonesian prayer-times reminder app originally created by **Ebta Setiawan** (2004-2012, Delphi + KOL, ~276 KB Windows .exe). The original was last updated 14 years ago.

Goal: full feature parity with the original (prayer-time calculation across 5 methods, qibla compass, Hijri converter, scheduled tasks, multi-language, adzan audio, system tray) on a modern cross-platform stack (Windows + macOS + Linux), with a modern UI.

**License:** [PolyForm Noncommercial 1.0.0](LICENSE.md) — non-commercial use only, derived from the original Shollu's non-commercial OSS license. See [ATTRIBUTION.md](ATTRIBUTION.md) for heritage details.

## Stack

- **Backend:** Rust + Tauri 2 (`src-tauri/`)
- **Frontend:** SolidJS + TypeScript (`src/`)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **Package manager:** pnpm 11
- **Target binary size:** 5-8 MB (compared to 276 KB original — modern WebView trade-off)
- **Target platforms:** Windows, macOS, Linux (mobile out of scope)

Exact version pins: see `package.json` + `src-tauri/Cargo.toml`.

## Commands

> Prepend `F:\dev\.cargo\bin` to PATH first when running cargo from a fresh shell (custom CARGO_HOME):
> ```powershell
> $env:Path = "F:\dev\.cargo\bin;" + $env:Path
> ```

```bash
# Run dev mode (Vite dev server + Rust hot-reload + desktop window)
pnpm tauri dev

# Frontend only — Vite dev server on http://localhost:1420
pnpm dev

# Build frontend (production, outputs to dist/)
pnpm build

# Build full Tauri app (frontend + release Rust binary + installer)
pnpm tauri build

# Run Rust unit tests
cd src-tauri && cargo test --lib

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
├── CHANGELOG.md               Keep-a-Changelog; v0.1.0-alpha tag
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        (esbuild build approval)
├── .npmrc
├── .gitattributes
├── .gitignore
├── index.html
├── tsconfig.json, tsconfig.node.json
├── vite.config.ts             Vite + Solid + Tailwind v4
├── docs/                      ← index: docs/README.md
│   ├── ROADMAP.md             Phased action plan; check status here
│   ├── UI_HANDOFF.md          Brief for UI/UX agent
│   ├── original-license.txt   Verbatim from Ebta's distribution (load-bearing)
│   ├── reference/             prayer-time-algorithm, data-formats, module-survey, ui-design
│   ├── release/               code-signing, courtesy-outreach, walkthrough
│   └── design-system/         Design tokens, HTML previews, hi-fi UI-kit prototype
├── public/                    Static assets served by Vite (icons, logo)
├── src/                       SolidJS frontend
│   ├── App.tsx
│   ├── App.css                Tailwind v4 + theme tokens
│   ├── index.tsx
│   ├── helpers.ts             Time formatting + localization helpers
│   ├── components/            One PascalCase.tsx per page + overlays (FloatingBar, DropZone, QiblaCompass, Icons)
│   └── assets/
└── src-tauri/                 Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/
    ├── icons/
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
- **Rust:** `cargo fmt` defaults. Use `cargo clippy` before commits but don't gate yet — fix warnings as you encounter them, don't block on legacy.
- **TypeScript:** Prettier defaults. Single quotes, no semicolons optional, trailing commas. Run `pnpm exec prettier --write src/` if installed; otherwise just follow existing files.
- **Tailwind:** Compose utilities over writing custom CSS. Use `@theme` in `App.css` for design tokens (already set up). Dark mode via `dark:` variant.
- **Imports:** Group + sort: std lib → external crates → internal modules. For TS: react/solid → external → internal. No deep relative paths beyond `../`.

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
- TypeScript: not set up yet. When needed, use Vitest (matches Vite ecosystem).

## Non-negotiable rules

These are baked in. Don't violate them without explicit user authorization.

1. **Attribution to Ebta Setiawan stays.** README, ATTRIBUTION.md, About page, in-code `// derived from Shollu.pas:NNN by Ebta Setiawan` comments — none of this is removed or watered down. The Indonesian license text says "Bagi yang ingin mengembangkannya kami persilahkan" — we honor that by keeping his name prominent.

2. **License stays PolyForm Noncommercial 1.0.0.** Don't relicense to MIT/Apache/GPL. The original Shollu prohibits commercial use; any derivative inherits that.

3. **Don't rename the project away from "Shollu Modern" without user say-so.** If a trademark issue arises later, that's a separate conversation.

4. **Don't bundle commercial integrations.** No paid services, no ads, no telemetry, no analytics, no subscription gates.

5. **Don't delete `docs/original-license.txt` or `ATTRIBUTION.md`.** They're load-bearing for licensing compliance.

## Current state (2026-07-19)

- ✅ Phases 0-4 complete (see `docs/ROADMAP.md`): full Rust backend (B1-B9), complete SolidJS UI (U0-U15), tray + overlay widgets, bilingual i18n
- ✅ First release `v0.1.0-alpha` tagged and published via GitHub Actions
- ✅ 25 Rust unit tests pass (`cargo test --lib`)
- ⏳ Pending: configure code-signing secrets (see `docs/release/code-signing.md`), send courtesy email to Ebta (drafts ready), post-MVP polish toward v0.1.0 stable

See `docs/ROADMAP.md` for the phased action plan and current status of each item.

## Next priorities (in order)

1. **Signed releases:** configure updater keys + Authenticode/notarization per `docs/release/code-signing.md`, then cut a signed build.
2. **Courtesy outreach:** send the draft in `docs/release/courtesy-outreach.md` to Ebta Setiawan.
3. **Stabilize:** triage post-MVP feedback and push toward v0.1.0 stable.

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
- Author email (for courtesy notice): ebta.setiawan@gmail.com
