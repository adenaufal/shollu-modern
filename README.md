# Shollu Modern

[Read in English](README.en.md)

Aplikasi desktop pengingat waktu sholat yang dibangun ulang dari **[Shollu](https://github.com/ebta/shollu)** karya **Ebta Setiawan** (2004–2012), menggunakan Rust, Tauri 2, dan SolidJS.

**Status per 30 September 2026:** versi aplikasi **1.0.0** sudah berada di `main` dan dikonfirmasi berfungsi oleh pengguna pada Windows. Installer Windows lokal sudah dibuat. Distribusi publik dan signing ditunda sampai pengguna siap membagikannya; belum ada installer v1 yang diterbitkan di GitHub Releases.

[Panduan v1](docs/V1.md) · [Dokumentasi](docs/README.md) · [Changelog](CHANGELOG.md) · [Roadmap](docs/ROADMAP.md)

## Tampilan

Mode **Tenang** memakai rail ikon, kartu hitung mundur, dan day arc. Mode **Ringkas** memakai tab, tabel jadwal bulanan, inspector, dan status bar. Keduanya mengikuti handoff `design_handoff_shollu_ui` dan berbagi pengaturan serta jadwal.

![Mode Tenang](docs/screenshots/tenang-main.png)

![Mode Ringkas](docs/screenshots/ringkas-main.png)

## Fitur v1

- Jadwal sholat dengan lima metode: ISNA, Karachi, Muslim World League, Umm Al-Qura, dan Mesir; pilihan Asar, pembulatan, dan koreksi menit.
- Pencarian kota dari basis data `.spn` asli yang diimpor ke SQLite lokal, pratinjau lokasi sebelum simpan, dan kompas kiblat. Zona waktu berupa offset UTC tetap yang dipilih pengguna; data kota asli tidak memuat zona waktu atau aturan daylight saving.
- Kalender bulanan, detail hari, ekspor CSV/HTML/TXT melalui dialog native, dan konversi Masehi–Hijriah dengan koreksi −1/0/+1 hari.
- Pengingat kustom dengan buat/edit/hapus dan sakelar aktif, serta pengaturan adzan per waktu sholat. Pengingat kustom mengikuti jam komputer; pengingat sholat mengikuti zona lokasi.
- Audio adzan bawaan Shollu3, doa setelah adzan, pratinjau per waktu sholat, pilihan file kustom, dan tombol kembali ke suara bawaan.
- Bahasa Indonesia/English, tiga tema (light, dark, sepia), lima aksen, serta font yang disertakan untuk pemakaian offline.
- Tray sistem, bilah melayang, drop zone, always-on-top, autostart, dan penyimpanan pengaturan lokal. Jadwal, pencarian kota, dan audio bawaan bekerja tanpa internet setelah aplikasi terpasang.

### Rekaman adzan

| Waktu sholat | Rekaman bawaan |
| --- | --- |
| Subuh | `azan-fajr.mp3` |
| Dzuhur dan Isya | `azan-mecca.mp3` |
| Ashar | `azan-egypt.mp3` |
| Magrib | `azan-dammam.mp3` |

`dua.mp3` diputar setelah adzan dalam antrean yang sama. Tombol Hentikan membatalkan keduanya. File kustom mengganti suara adzan untuk semua waktu sholat dan tetap diikuti doa. Syuruq tidak memicu adzan. `basmallah.mp3` dan `hamdallah.mp3` sudah disertakan, dengan fungsi lanjutan ditunda di [issue #45](https://github.com/adenaufal/shollu-modern/issues/45). Asal file dan notice lisensi ada di [direktori audio](src-tauri/audio/README.md).

## Mencoba dan membangun aplikasi

Untuk mencoba sendiri, gunakan installer Windows lokal hasil build. Signing tidak menjadi syarat untuk pengujian pribadi. Paket NSIS berada di `src-tauri/target/release/bundle/nsis/`; installer terakhir berukuran sekitar **8,10 MiB** dan belum memiliki tanda tangan Authenticode.

### Prasyarat pengembangan

- Node.js **22.x ≥ 22.13.0** dan **pnpm 11**; versi Node CI adalah 22.13.0.
- Rust stable dan toolchain native Tauri: Windows memerlukan C++ Build Tools, Windows SDK, dan WebView2; macOS memerlukan Xcode Command Line Tools; Linux memerlukan paket WebKitGTK, indikator tray, dan ALSA.
- Rincian dependensi sistem dan alur kontribusi: [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
git clone https://github.com/adenaufal/shollu-modern.git
cd shollu-modern
pnpm install --frozen-lockfile
pnpm tauri dev
```

Instalasi dependensi dan build pertama memerlukan internet. `pnpm dev` hanya menjalankan frontend; fungsi desktop memerlukan runtime Tauri.

Untuk membuat installer Windows lokal tanpa artefak updater bertanda tangan, jalankan dari PowerShell:

```powershell
pnpm tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

Saat distribusi publik dibutuhkan, signing akan diotomatisasikan menjadi satu perintah atau workflow CI setelah sertifikat/provider dipilih. Lihat [catatan signing lokal dan rencana distribusi](docs/release/windows-local-signing.md).

## Verifikasi

```sh
pnpm test
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --lib -- -D warnings
```

Baseline v1: **38 tes Rust**, **6 tes frontend**, pemeriksaan TypeScript/build, Clippy tanpa warning, dan **17 kelompok uji desktop Windows** terhadap aplikasi release serta IPC Tauri asli. CI memeriksa frontend dan Rust pada Windows, macOS, serta Linux. Uji interaksi native dan konfirmasi pengguna dilakukan di Windows; hasil CI tidak menggantikan pengujian antarmuka native pada platform lain. Aksi shutdown/hibernasi tidak dieksekusi dalam smoke test.

Petunjuk `pnpm test:desktop`, konfigurasi uji terisolasi, dan pintasan tersedia di [panduan v1](docs/V1.md).

## Lisensi dan kredit

Shollu Modern memakai [PolyForm Noncommercial 1.0.0](LICENSE.md). Penggunaan dan kontribusi mengikuti ketentuan nonkomersial serta notice karya asli.

- **Ebta Setiawan** — pencipta Shollu asli; algoritma, basis data, paket bahasa, rekaman distribusi, dan warisan aplikasinya tetap diakui dalam [ATTRIBUTION.md](ATTRIBUTION.md).
- **adenaufal** (Ade Naufal Ammar) — pemelihara Shollu Modern.
- Komunitas pengguna dan kontributor Shollu.
