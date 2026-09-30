# Dokumentasi Shollu Modern

**Kondisi per 30 September 2026:** aplikasi 1.0.0 berada di `main` dan telah dikonfirmasi berfungsi oleh pengguna di Windows. Installer lokal dengan audio Shollu3 tersedia sebagai hasil build; publikasi v1 dan signing masih ditunda. Mulai dari [panduan v1](V1.md) untuk penggunaan, audio, pintasan, build, dan verifikasi.

## Penggunaan dan status

| Dokumen | Isi |
| --- | --- |
| [V1.md](V1.md) | Panduan aplikasi yang berjalan, audio bawaan, pengaturan, pintasan, serta batas verifikasi platform |
| [ROADMAP.md](ROADMAP.md) | Status v1, riwayat fase, dan pekerjaan lanjutan |
| [UI_HANDOFF.md](UI_HANDOFF.md) | Konteks desain, implementasi Tenang/Ringkas, dan catatan untuk kontributor UI |
| [CHANGELOG.md](../CHANGELOG.md) | Perubahan versi dan status distribusi |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Setup pengembangan, dependensi sistem, dan pemeriksaan sebelum kontribusi |

## Referensi teknis

| Dokumen | Isi |
| --- | --- |
| [prayer-time-algorithm.md](reference/prayer-time-algorithm.md) | Rumus dan asal algoritma `Shollu.pas`, dengan konteks implementasi saat ini |
| [data-formats.md](reference/data-formats.md) | Format sumber `.slp` dan `.spn`, serta penggunaan data lokal |
| [module-survey.md](reference/module-survey.md) | Pemetaan Pascal ke Rust/Solid dan riwayat perencanaan |
| [ui-design.md](reference/ui-design.md) | Referensi desain awal dan hubungannya dengan UI v1 |
| [Audio Shollu3](../src-tauri/audio/README.md) | Asal tujuh MP3, pemetaan per sholat, doa, dan pekerjaan basmallah/hamdallah ([#45](https://github.com/adenaufal/shollu-modern/issues/45)) |

## Distribusi dan komunitas

| Dokumen | Isi |
| --- | --- |
| [windows-local-signing.md](release/windows-local-signing.md) | Pengujian pribadi saat ini dan rencana otomatisasi signing ketika distribusi publik diminta |
| [code-signing.md](release/code-signing.md) | Perbedaan signing updater, Windows Authenticode, serta macOS signing/notarization |
| [walkthrough.md](release/walkthrough.md) | Riwayat pekerjaan rilis dan baseline verifikasi terbaru |
| [courtesy-outreach.md](release/courtesy-outreach.md) | Draft komunikasi kepada Ebta Setiawan; bukan bukti email sudah dikirim |

## Arsip desain

| Dokumen | Isi |
| --- | --- |
| [Design system](design-system/README.md) | Token dan panduan desain awal, disertai konteks UI saat ini |
| [Pratinjau HTML](design-system/preview/) | Eksplorasi skala warna, tipografi, dan komponen |
| [Prototipe aplikasi](design-system/ui_kits/shollu-app/README.md) | Prototipe 900×600 sebagai arsip desain; runtime saat ini memakai 960×660 dengan minimum 600×480 |

Untuk perilaku aktual, utamakan panduan v1 dan kode di `src/` serta `src-tauri/src/`. Prototipe awal tidak menetapkan fitur atau ukuran jendela aplikasi saat ini.

## Lisensi dan warisan

- [Lisensi asli](original-license.txt) — notice asli Shollu, dipertahankan verbatim.
- [ATTRIBUTION.md](../ATTRIBUTION.md) — kredit Ebta Setiawan dan asal karya/data/audio.
- [LICENSE.md](../LICENSE.md) — PolyForm Noncommercial 1.0.0.
- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) — pedoman komunitas.
