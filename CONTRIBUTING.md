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

Version 1.0.0 is implemented and confirmed working by the user on Windows. Current usage and platform verification are documented in [the v1 guide](docs/V1.md). Public distribution/signing is deferred; contribution work does not imply publishing a release.

### Prerequisites

- **Node.js** 22.x ≥22.13.0 and **pnpm** 11 (matching CI)
- **Rust** stable toolchain (install via [rustup](https://rustup.rs/))
- **Platform toolchain:**
  - Windows: Visual Studio Build Tools 2022 with C++ workload, Windows SDK, and WebView2
  - macOS: Xcode Command Line Tools
  - Linux (Debian/Ubuntu): `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`, `libasound2-dev`; release bundling also uses `patchelf`

### Set up locally

```bash
git clone https://github.com/<your-username>/shollu-modern.git
cd shollu-modern
pnpm install --frozen-lockfile
pnpm tauri dev
```

The desktop window should open within a couple of minutes (longer on first build because of Rust compilation).

### Run tests

```bash
# Frontend: regression tests, types, production build
pnpm test
pnpm build

# Rust backend
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --lib -- -D warnings
```

CI runs those checks on Windows, macOS, and Linux. Windows native smoke testing (`pnpm test:desktop`) uses the real desktop backend and isolated data; see the debug/release instructions in [V1.md](docs/V1.md). Native UI testing on macOS/Linux is still welcome. Do not run destructive shutdown/hibernate actions as part of smoke testing.

Commit both lockfiles when dependencies change. `pnpm-workspace.yaml` keeps the 24-hour dependency release-age policy and pins `std-env` to the compatible aged version; preserve that policy when updating packages.

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
5. Run the checks relevant to your change; code changes must pass the frontend and Rust checks above. For documentation-only changes, inspect the diff and verify links/instructions.
6. Open a pull request against `main` with a clear description.

### Code style

- **Rust:** Default `rustfmt`; CI requires formatting and Clippy with warnings denied.
- **TypeScript:** Prettier defaults. The project uses Tailwind v4 utility classes — prefer composing utilities over writing custom CSS unless there's a strong reason.
- **Commit messages:** Short imperative subject line (under 70 chars), longer body if needed. e.g., `port hijri converter from Shollu.pas:301`.

## Areas where help is welcome

In rough priority:

1. **Native platform verification** — test tray, notifications, overlays, audio, and persistence on macOS/Linux.
2. **Regression coverage** — high-latitude behavior, clock/calendar boundaries, reference schedules, and native integration failures.
3. **Accessibility** — keyboard navigation, ARIA labels, screen-reader testing, and contrast audits in both modes.
4. **Deferred audio behavior** — define the original basmallah/hamdallah triggers and implement them under [issue #45](https://github.com/adenaufal/shollu-modern/issues/45).
5. **Localization** — UI translations beyond Indonesian/English; bundled original language packs do not mean every pack is supported by the new UI.
6. **Future public distribution** — automate signing when requested and a provider is selected; preserve separate Authenticode/updater/notarization requirements. See [the distribution note](docs/release/windows-local-signing.md).

## Attribution

When adding meaningful new contributions, feel free to append your name to a `CONTRIBUTORS.md` file (create it if not present). Original authorship of any code derived from Shollu must remain credited to Ebta Setiawan as required by the original license.

## Questions

Open a GitHub Discussion or an issue tagged `question`.

Jazakumullah khoiron — thank you for helping carry this work forward.
