# Release status and verification snapshot

**Status as of 2026-09-30:** Shollu Modern v1.0.0 is in `main`. The owner has personally tested v1. The v1 public release has not been published. The earlier `v0.1.0-alpha` tag and preparation notes are historical; a public alpha release is not verified.

## v1.0.0 status

The current app includes the Tenang and Ringkas layouts, configurable prayer times, and the bundled prayer audio. The original Shollu MP3 files are stored under `src-tauri/audio/`: Fajr uses the Fajr recording; Dhuhr and Isha use Mecca; Asr uses Egypt; Maghrib uses Dammam. Dua follows each prayer's adhan in the playback queue. Basmallah and hamdallah are packaged but have no runtime triggers yet; that work is deferred to [issue #45](https://github.com/adenaufal/shollu-modern/issues/45).

The verification snapshot reported for this handoff is 38 Rust unit tests, one separate release-resolver test, 6 frontend tests, and 17 native Windows smoke-test groups. CI runs on Windows, macOS, and Linux. These checks and the owner's personal testing support the current v1 handoff; they do not establish complete feature parity with the original app.

PRs #25, #28, #44, and #46 are merged. Windows installer size is 8.10 MiB and the installer is unsigned. Signing is deferred, with a future one-command and CI plan documented in [code-signing.md](code-signing.md). No certificate or trust changes have been made. See the [Windows local signing guide](windows-local-signing.md) for the separate local signing workstream.

## Historical: v0.1.0-alpha release preparation (24 May 2026)

The project created the `v0.1.0-alpha` tag and documented release preparation. A corresponding published GitHub release is not verified. The old walkthrough described signing and outreach as completed; those statements referred to guide/draft preparation only. No courtesy email has been sent, and signing is not complete.

The alpha tag and its original notes remain part of project history. Refer to [CHANGELOG.md](../../CHANGELOG.md) for version-specific change records.
