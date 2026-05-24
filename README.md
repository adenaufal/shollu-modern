# Shollu Modern

A modern, cross-platform revival of [Shollu](https://github.com/ebta/shollu) — the prayer times reminder for Muslims originally created by Ebta Setiawan (2004-2012).

> **Status:** Early development. The project structure is being set up. See [docs/](docs/) for planning notes.

## Why This Exists

Shollu was a beloved, lightweight (~276 KB) prayer-times app for Windows, built in Delphi using the KOL toolkit. After 14 years without updates, it still runs but feels increasingly out of place on modern systems. **Shollu Modern** aims to bring its features forward — modern UI, native macOS and Linux support, current platform integrations — while keeping the spirit of the original: lightweight, focused, free of telemetry, free of nag screens.

The original work, and its author Ebta Setiawan, are credited prominently. See [ATTRIBUTION.md](ATTRIBUTION.md).

## Planned Features (Parity with Original)

- [ ] Prayer time calculation (5 methods: ISNA, Karachi, World Islamic League, Umul Qura, Egypt General Org)
- [ ] Qibla direction compass
- [ ] Adzan audio playback (per-prayer, with optional dua after)
- [ ] Hijri ↔ Masehi calendar conversion
- [ ] Scheduled tasks (info dialogs, custom commands, shutdown/hibernate, multimedia)
- [ ] Multi-language UI (Indonesian, English, Aceh, Banyumasan, Sunda, Jawa, Palembang)
- [ ] City database (Indonesia + 2,341 world cities + user-addable)
- [ ] Theming (light/dark + auto + custom palettes)
- [ ] System tray with quick controls
- [ ] Floating mini-display widget (the "drop zone" from the original)
- [ ] Settings persistence (cross-platform — no Windows Registry dependency)

## Stack

- **Tauri 2** (Rust backend, native WebView frontend)
- **SolidJS** + **TypeScript** (UI)
- **Tailwind CSS** (styling)
- Cross-platform: Windows, macOS, Linux

Target binary size: 5-8 MB (vs ~276 KB original; remarkable for the original era, modest for 2026).

## Development

> Prerequisites: Node 20+, pnpm, Rust toolchain (rustup), and platform build tools (MSVC on Windows, Xcode CLT on macOS, build-essential on Linux).

```bash
# After scaffold is complete:
pnpm install
pnpm tauri dev
```

Full setup instructions will be added once the project is scaffolded.

## License

Shollu Modern is licensed under [PolyForm Noncommercial 1.0.0](LICENSE.md) — free for personal, educational, religious, and noncommercial use. Commercial use is not permitted.

This matches the spirit and terms of the original Shollu license. See [ATTRIBUTION.md](ATTRIBUTION.md) for full details on heritage and license compatibility.

## Credits

- **Ebta Setiawan** — original author of Shollu (2004-2012). Without his work, this project would not exist.
- The Muslim community in Indonesia and beyond who used and supported Shollu for nearly two decades.
