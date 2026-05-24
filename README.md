# Shollu Modern

[Read in English (Baca dalam Bahasa Inggris) 🇬🇧](./README.en.md)

Sebuah pembangunan ulang modern dan lintas platform dari **[Shollu](https://github.com/ebta/shollu)** — aplikasi pengingat waktu sholat desktop legendaris untuk umat Muslim yang aslinya diciptakan oleh **Ebta Setiawan** (2004–2012).

Proyek ini mempertahankan 100% kecocokan logika kalkulasi astronomi asli, database tempat biner asli, paket bahasa asli, serta mesin penjadwalan alarm cron dari Delphi, dan memperbarui seluruh lapisan visualnya agar tampil premium di sistem operasi modern.

> **Status:** MVP `v0.1.0-alpha` telah selesai dan beroperasi 100%! Terverifikasi dengan **0 peringatan clippy** dan **100% kelulusan unit test Cargo** di Windows, macOS, dan Linux.

---

## Mengapa Proyek Ini Ada

Aplikasi **Shollu v3.10** asli adalah aplikasi pengingat waktu sholat yang luar biasa ringan (~276 KB) untuk Windows, ditulis menggunakan Delphi dengan toolkit KOL. Aplikasi ini sangat dicintai dan menemani keseharian satu generasi umat Muslim di Indonesia pada era XP-Windows 7. Setelah 14 tahun tanpa pembaruan, Shollu asli masih dapat berjalan namun terasa kurang terintegrasi dengan antarmuka desktop masa kini serta tidak mendukung macOS/Linux secara bawaan.

**Shollu Modern** hadir untuk membawa fungsionalitas legendaris Shollu ke dalam kerangka desktop modern dengan antarmuka yang sangat responsif, premium, dan **100% dapat berjalan secara offline** tanpa iklan, pelacakan data (telemetri), ataupun batasan komersial.

Karya asli dan nama Mas Ebta Setiawan dihargai secara terhormat dalam proyek ini. Silakan baca berkas [ATTRIBUTION.md](ATTRIBUTION.md).

---

## Fitur yang Telah Selesai (Setara dengan Aslinya)

- **Kalkulasi Waktu Sholat** (`prayer_times.rs`): Implementasi 5 metode kalkulasi astronomis tradisional (ISNA, Karachi, Muslim World League, Umm Al-Qura, Mesir) dan presisi waktu sholat yang sesuai dengan Shollu 3 asli (uji Pekanbaru).
- **Kompas Kiblat** (`qibla.rs`): Perhitungan sudut arah Ka'bah dari titik koordinat pengguna secara sferis dilengkapi jarum kompas SVG interaktif yang berputar halus.
- **Antarmuka Bilingual**: Lokalisasi SolidJS dinamis berbasis kamus bahasa asli `.slp`, mendukung perpindahan bahasa Inggris dan Bahasa Indonesia secara langsung.
- **Pencari Kota Autocomplete** (`places.rs`): Konversi database tempat biner `.spn` asli ke dalam SQLite lokal. Pencarian kota autocomplete mencakup 10.000+ wilayah administratif di Indonesia dan dunia, otomatis mengisi koordinat dan zona waktu.
- **Konversi Kalender** (`hijri.rs`): Konversi tanggal dua arah antara kalender Masehi (Gregorian) dan Hijriah beserta offset kalibrasinya.
- **Penjadwal Alarm (Cron Engine)** (`scheduler.rs`): Mesin asinkron berbasis Tokio yang mendeteksi alarm waktu sholat, menampilkan dialog peringatan pesan tambahan, menjalankan skrip perintah OS, memutar suara adzan MP3 via Rodio/CPAL, serta mengontrol kondisi daya PC (Shutdown/Hibernate).
- **Tema & Aksen Premium**: Kustomisasi visual loaded dengan 3 tema dasar (`light`, `dark`, dan tema parchment `sepia` yang ramah mata saat malam) serta 5 dot aksen warna (`teal` (brand), `indigo`, `emerald`, `rose`, `slate`).
- **Angka Tabular Jitter-Free**: Tampilan hitung mundur real-time menggunakan `font-variant-numeric: tabular-nums` untuk mencegah geseran layout saat detik berdetik.
- **Widget Layar Melayang (Overlay Windows)**:
  - **U11 `<FloatingBar>`**: Bilah info horizontal melayang borderless yang dapat digeser untuk menampilkan hitung mundur dan jadwal sholat hari ini.
  - **U12 `<DropZone>`**: Widget mini kotak penunjuk hitung mundur yang dapat digeser dan menempel di sudut layar (edge-snapping).
- **Tray Sistem**: Tombol integrasi cepat tray sistem pada footer navigasi sidebar dan pengaturan.
- **Penyimpanan Terdistribusi** (`settings.rs`): Penyimpanan konfigurasi umum berformat TOML lintas platform (bebas ketergantungan Windows Registry).

---

## Teknologi Stack

- **Tauri 2** (Rust backend & Webview window controller)
- **SolidJS** + **TypeScript** (High-performance reactive frontend components)
- **Tailwind CSS v4** (Modern utility styles)
- **SQLite** (Mesin pencarian tempat lokal yang super cepat)

---

## Pengembangan Lokal & Kompilasi (Offline)

### Prasyarat
Pastikan Anda memiliki Node.js 20+, `pnpm`, dan Rust toolchain (`cargo`, `rustup`) yang terkonfigurasi pada mesin Anda.

```bash
# Klon repositori
git clone https://github.com/adenaufal/shollu-modern.git
cd shollu-modern

# Instalasi dependensi JS
pnpm install

# Jalankan dalam mode pengembangan (live-reload aktif)
pnpm tauri dev

# Kompilasi paket rilis installer offline mandiri (.exe / .msi di Windows)
pnpm tauri build
```

Berkas kompilasi installer mandiri akan berada di direktori `src-tauri/target/release/`.

---

## Lisensi

Shollu Modern dilisensikan di bawah [Lisensi PolyForm Noncommercial 1.0.0](LICENSE.md) — sepenuhnya gratis untuk penggunaan pribadi, edukasi, keagamaan, dan komunitas non-komersial. Eksploitasi komersial sangat dilarang.

---

## Penghargaan & Kredit

- **Ebta Setiawan** — pencipta asli aplikasi pengingat waktu sholat desktop Shollu (2004–2012). Tanpa dedikasi karya beliau, proyek modernisasi ini tidak akan pernah ada.
- Komunitas Muslim di Indonesia dan dunia yang telah menggunakan dan mendukung Shollu selama hampir dua dekade.
- Dikembangkan dan dipelihara oleh **adenaufal** (Ade Naufal Ammar).
