# Menandatangani installer Windows lokal

Installer `.exe` memakai Windows Authenticode. Kunci `TAURI_SIGNING_PRIVATE_KEY` hanya menandatangani artefak updater Tauri; kunci itu tidak memberikan identitas penerbit pada installer Windows.

## Catatan untuk distribusi publik nanti

Keputusan pengguna pada 30 September 2026: coba aplikasi sendiri dahulu menggunakan installer lokal yang sudah tersedia. Signing dan distribusi publik ditunda.

Saat pengguna ingin membagikan aplikasi ke publik, otomatisasikan proses menjadi satu perintah atau workflow CI setelah sertifikat/provider signing dipilih:

- Bangun aplikasi, tandatangani executable sebelum bundling, lalu tandatangani installer NSIS dengan timestamp.
- Verifikasi signature dan identitas penerbit pada keduanya; hitung checksum setelah signing.
- Bila memakai updater, buat dan verifikasi artefak updater dengan kunci Tauri yang sesuai secara terpisah.
- Ambil kredensial dari certificate store atau secret yang sesuai; simpan private key/password di luar repository.

Konfigurasi contoh `src-tauri/tauri.windows-signing.example.json` menjadi titik awal otomatisasi. Catatan ini merupakan rencana pekerjaan berikutnya, bukan instruksi untuk menerbitkan release sekarang.

## Pilihan sertifikat

Gunakan sertifikat **code signing** yang memiliki private key dan dapat diakses oleh SignTool. Sertifikat SSL tidak cocok. Sertifikat dari CA/token/cloud mengikuti petunjuk penyedia; penyedia yang memakai alat khusus dapat dihubungkan melalui `bundle.windows.signCommand`. Tanda tangan yang valid tetap dapat menampilkan peringatan SmartScreen ketika reputasi penerbit/file belum terbentuk. Lihat [panduan resmi Tauri](https://v2.tauri.app/distribute/sign/windows/).

## Sertifikat lokal yang tersedia di Windows certificate store

1. Pasang Windows SDK agar `signtool.exe` tersedia. Pada komputer pengembangan saat ini, lokasinya adalah `C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe`.
2. Jika memiliki PFX yang memang diizinkan oleh penyedia sertifikat, impor ke store pengguna melalui PowerShell. Masukkan password secara interaktif, bukan sebagai literal atau argumen command line:

   ```powershell
   $signingPassword = Read-Host 'Password PFX' -AsSecureString
   $signingCert = Import-PfxCertificate -FilePath 'C:\Certificates\codesigning.pfx' -CertStoreLocation Cert:\CurrentUser\My -Password $signingPassword
   $signingCert.Thumbprint
   ```

   Private key harus tersedia. Untuk hardware token, pasang driver/provider dan gunakan prosedur penyedia; jangan mencoba mengekspor key dari token.
3. Dari root proyek, salin konfigurasi contoh:

   ```powershell
   Copy-Item -LiteralPath src-tauri/tauri.windows-signing.example.json -Destination src-tauri/tauri.windows-signing.local.json
   ```

   Ganti `certificateThumbprint` dalam file lokal dengan thumbprint sertifikat. `tsp: true` memilih timestamp RFC 3161; gunakan URL timestamp yang disarankan penyedia. File lokal dan berkas PFX/P12 diabaikan Git.
4. Bangun aplikasi dan installer dengan konfigurasi tersebut:

   ```powershell
   pnpm tauri build --bundles nsis --config src-tauri/tauri.windows-signing.local.json
   ```

   Bundler menandatangani executable aplikasi sebelum dimasukkan ke installer, lalu installer NSIS. Contoh ini menonaktifkan artefak updater agar build Authenticode lokal tidak membutuhkan private key updater. Untuk release updater, sediakan kunci updater yang sesuai dengan public key proyek secara terpisah.
5. Periksa **keduanya**:

   ```powershell
   $signingTool = 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe'
   & $signingTool verify /pa /v 'src-tauri\target\release\shollu-modern.exe'
   & $signingTool verify /pa /v 'src-tauri\target\release\bundle\nsis\Shollu Modern_1.0.0_x64-setup.exe'
   Get-AuthenticodeSignature -LiteralPath 'src-tauri\target\release\bundle\nsis\Shollu Modern_1.0.0_x64-setup.exe' | Select-Object Status,StatusMessage
   ```

   Keduanya harus terverifikasi dan menunjuk penerbit yang diharapkan. Hitung ulang SHA256 setelah signing karena signature mengubah isi file. Referensi opsi `/pa`, `/fd`, `/tr`, dan `/td`: [Microsoft SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool).

## Sertifikat self-signed untuk percobaan pribadi

Jika belum memiliki sertifikat CA, Windows menyediakan sertifikat uji. Jalankan sendiri bila memang ingin membuat identitas signing uji:

```powershell
$signingCert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=Shollu Modern Local Test' -CertStoreLocation Cert:\CurrentUser\My -HashAlgorithm SHA256
$signingCert.Thumbprint
```

Gunakan thumbprint tersebut pada langkah build di atas. Certificate ini belum dipercaya otomatis. Bila ingin memverifikasi pada komputer uji milik sendiri, ekspor **public certificate** melalui `certmgr.msc` dan impor hanya public certificate itu ke Trusted Root Certification Authorities serta Trusted Publishers milik Current User pada komputer uji. Jangan membagikan private key.

Self-signed sesuai untuk percobaan pada perangkat yang Anda kelola, bukan pengganti sertifikat yang dipercaya publik. Tanpa trust certificate yang disengaja, verifikasi akan melaporkan chain tidak dipercaya. Panduan cmdlet: [Microsoft New-SelfSignedCertificate](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate).

Tidak ada sertifikat, private key, atau perubahan trust store yang dibuat otomatis oleh proyek ini.
