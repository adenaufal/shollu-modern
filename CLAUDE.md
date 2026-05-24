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
├── CODE_OF_CONDUCT.md         (to be added — Contributor Covenant 2.1)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        (esbuild build approval)
├── .npmrc
├── .gitattributes
├── .gitignore
├── index.html
├── tsconfig.json, tsconfig.node.json
├── vite.config.ts             Vite + Solid + Tailwind v4
├── docs/
│   ├── ROADMAP.md             ← phased action plan; check status here
│   ├── UI_HANDOFF.md          ← brief for UI/UX agent
│   ├── original-license.txt   Verbatim from Ebta's distribution
│   ├── prayer-time-algorithm.md
│   ├── data-formats.md        .slp + .spn binary specs
│   ├── module-survey.md       Pascal-to-Rust/Solid mapping with effort estimates
│   └── ui-design.md           Information architecture + screen specs
├── src/                       SolidJS frontend
│   ├── App.tsx
│   ├── App.css                Tailwind v4 + theme tokens
│   ├── index.tsx
│   └── assets/
└── src-tauri/                 Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/
    ├── icons/
    └── src/
        ├── main.rs
        ├── lib.rs             Tauri runtime + command registration
        └── prayer_times.rs    Ported from Shollu.pas:408-472
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

## Current state (2026-05-20)

- ✅ Bootstrap done: scaffold builds + runs, prayer-time math ported and validated against Shollu3 (max delta 11s)
- ✅ 4 unit tests pass (`cargo test --lib`)
- ✅ Documentation in `docs/` is comprehensive
- ⏳ Pending: git push to GitHub, port remaining 8 Rust modules, build UI components, set up CI

See `docs/ROADMAP.md` for the phased action plan and current status of each item.

## Next priorities (in order)

1. **Infrastructure:** git init → commit → `gh repo create adenaufal/shollu-modern --public` → push. Then add CONTRIBUTING.md (done), CODE_OF_CONDUCT.md, GitHub Actions CI workflow.
2. **Backend quick wins:** B1 Hijri converter (port `Shollu.pas:301-379`, ~XS), B2 Qibla bearing (port `UMainPage.pas:179-188`, ~XS), B3 astro helpers (~XS).
3. **Hand off UI work:** see `docs/UI_HANDOFF.md` — give that doc to the UI agent.
4. **Heavier backend:** B4-B9 (places SQLite, i18n, settings, scheduler, audio).
5. **Release:** signed cross-platform builds.

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
