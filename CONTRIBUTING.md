# Contributing to Shollu Modern

Thanks for your interest in contributing! Shollu Modern is a community revival of [Shollu](https://github.com/ebta/shollu) — Ebta Setiawan's beloved prayer-times app (2004-2012). The goal is to bring its features forward into a modern, cross-platform desktop app while honoring the original work and license.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License & noncommercial scope

Shollu Modern is released under [PolyForm Noncommercial 1.0.0](LICENSE.md), matching the spirit of the original Shollu license. **All contributions are accepted under the same terms.** By submitting a pull request you agree that:

- Your contribution may be freely used, copied, modified, and distributed for any noncommercial purpose.
- The project — and any work derived from it — will not be made commercial.
- Original credit to Ebta Setiawan and to all contributors will be preserved.

If your intent is to build a commercial product, this is not the project for that. Please respect the original author's terms.

## Quick start

### Prerequisites

- **Node.js** 20+ and **pnpm** 11+
- **Rust** stable toolchain (install via [rustup](https://rustup.rs/))
- **Platform toolchain:**
  - Windows: Visual Studio Build Tools 2022 with C++ workload and Windows 11 SDK
  - macOS: Xcode Command Line Tools
  - Linux: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Set up locally

```bash
git clone https://github.com/<your-username>/shollu-modern.git
cd shollu-modern
pnpm install
pnpm tauri dev
```

The desktop window should open within a couple of minutes (longer on first build because of Rust compilation).

### Run tests

```bash
# Rust backend
cd src-tauri
cargo test --lib

# Frontend
cd ..
pnpm build       # production build
pnpm dev         # vite dev server (without Tauri shell)
```

## How to contribute

### Reporting bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- OS + version, Shollu Modern version

### Suggesting features

Open an issue tagged `enhancement` describing the feature, the use case, and (if applicable) how it relates to the original Shollu's behavior.

### Submitting code

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/short-description`.
3. Make your changes. Keep commits focused and well-described.
4. Add or update tests where it makes sense.
5. Run `cargo test --lib` and `pnpm build` to make sure everything still works.
6. Open a pull request against `main` with a clear description.

### Code style

- **Rust:** Default `rustfmt` + `clippy`. Run `cargo fmt` and `cargo clippy` before pushing.
- **TypeScript:** Prettier defaults. The project uses Tailwind v4 utility classes — prefer composing utilities over writing custom CSS unless there's a strong reason.
- **Commit messages:** Short imperative subject line (under 70 chars), longer body if needed. e.g., `port hijri converter from Shollu.pas:301`.

## Areas where help is welcome

In rough priority:

1. **Backend modules** — porting remaining Pascal modules to Rust (`hijri.rs`, `places.rs`, `scheduler.rs`, `audio.rs`, `settings.rs`). See `docs/module-survey.md`.
2. **UI components** — building Solid components per `docs/ui-design.md` (MainPage, LocationSettings, CityPicker, etc.).
3. **Data migration** — converting original `.slp` (language) and `.spn` (city) files to JSON/SQLite (see `docs/data-formats.md`).
4. **Localization** — additional language translations beyond Indonesian/English (Aceh, Sunda, Jawa, Banyumasan, Palembang, etc.).
5. **Testing** — reference test cases against the original Shollu3.exe behavior for high latitudes, edge cases, calendar conversion.
6. **Accessibility** — keyboard navigation, ARIA labels, screen-reader testing, contrast audits.

## Attribution

When adding meaningful new contributions, feel free to append your name to a `CONTRIBUTORS.md` file (create it if not present). Original authorship of any code derived from Shollu must remain credited to Ebta Setiawan as required by the original license.

## Questions

Open a GitHub Discussion or an issue tagged `question`.

Jazakumullah khoiron — thank you for helping carry this work forward.
