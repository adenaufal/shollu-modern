# Shollu Modern — Courtesy Outreach Email Drafts

This document contains draft emails in Bahasa Indonesia and English for **Ebta Setiawan**, the original author of Shollu. **No courtesy email has been sent.** Review and personalize the draft before use.

Status as of 2026-09-30: v1.0.0 is in `main` and the owner has personally tested it. The v1 public release has not been published. The Windows installer is 8.10 MiB and unsigned; signing work is deferred. Keep these facts accurate if revising either draft.

Attribution and historical tribute are important, and reaching out is a kind gesture to show respect for his original work (2004–2012) which served a generation of Indonesian Muslim desktop users.

---

## Draft A: Bahasa Indonesia (Recommended)

**Subjek:** Silaturahmi & Kabar Modernisasi Aplikasi Pengingat Sholat Shollu

Yth. Mas Ebta Setiawan,

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Semoga Mas Ebta sekeluarga senantiasa berada dalam keadaan sehat wal afiat serta diberkahi kelimpahan rahmat oleh Allah SWT. Amin.

Perkenalkan, saya **[Nama Anda]**, salah satu pengembang perangkat lunak asal Indonesia. Saya menulis email ini untuk bersilaturahmi sekaligus membagikan kabar gembira mengenai salah satu karya legendaris Mas Ebta yang dahulu sangat menemani keseharian kami di komputer Windows: **Shollu**.

Sebagaimana kita ketahui, aplikasi pengingat waktu sholat Shollu (terutama versi terakhir v3.10) telah membantu umat Muslim di Indonesia. Untuk menghormati warisan karya Mas Ebta tersebut, saya bersama para kontributor di GitHub mengembangkan **Shollu Modern**, aplikasi desktop modern yang terinspirasi oleh Shollu untuk Windows, macOS, dan Linux.

Proyek ini bernama **Shollu Modern** dan kode sumbernya tersedia untuk penggunaan non-komersial di bawah lisensi *PolyForm Noncommercial 1.0.0*. Versi 1.0.0 saat ini berada di cabang utama (`main`); rilis publik v1 belum diterbitkan. Repositori:
👉 https://github.com/adenaufal/shollu-modern

Dalam proses pembangunan ulang ini, kami sangat menjaga keaslian kerja keras Mas Ebta terdahulu. Beberapa detail teknis yang kami lakukan antara lain:
1. Memporting rumus kalkulasi astronomi waktu sholat asli dari file kode `Shollu.pas` (Delphi) ke bahasa **Rust** yang super cepat dan aman.
2. Membangun parser untuk membaca database nama tempat asli (`.spn`) dan paket bahasa asli (`.slp`) agar kompatibilitas data masa lalu tetap terjaga.
3. Membuat antarmuka desktop dengan **SolidJS + Tailwind CSS**, termasuk tampilan Tenang dan Ringkas.

Saya telah mencoba sendiri versi v1.0.0. Installer Windows saat ini berukuran 8,10 MiB dan belum ditandatangani; pekerjaan penandatanganan ditunda.

Kredit nama Mas Ebta Setiawan serta tautan ke situs `ebsoft.web.id` kami sematkan secara terhormat dan sangat jelas pada halaman utama **"About"** aplikasi serta dokumentasi resmi repositori kami. Kami tidak pernah dan tidak akan pernah menghapus atribusi sejarah tersebut.

Tujuan utama proyek ini murni adalah sebagai ladang amal jariyah berkelanjutan demi kemudahan umat Muslim dalam mengingat waktu ibadah sholat di desktop mereka, sekaligus melanjutkan inspirasi kebaikan yang telah Mas Ebta tabur sejak lebih dari dua dekade lalu.

Kami sangat berharap Mas Ebta berkenan untuk memberikan restu, masukan, kritik, atau bahkan saran desain jika Mas Ebta memiliki waktu luang untuk melihat-lihat proyek ini. 

Terima kasih yang sebesar-besarnya atas warisan karya Shollu yang telah menginspirasi kami semua. Jasa kebaikan Mas Ebta akan selalu kami kenang.

Syukran jaziilan. Semoga Allah SWT membalas segala dedikasi dan amal kebaikan Mas Ebta dengan pahala yang berlipat ganda.

Wassalamu'alaikum Warahmatullahi Wabarakatuh,

Hormat kami,

**[Nama Anda]**  
[Tautan Profil GitHub Anda / Kontak]  
Tim Kontributor Shollu Modern  

---

## Draft B: English

**Subject:** Courtesy Update: Modernizing the Classic Islamic Prayer Reminder "Shollu"

Dear Ebta Setiawan,

Assalamu'alaikum Warahmatullahi Wabarakatuh,

I hope this email finds you and your family in good health and high spirits.

My name is **[Your Name]**, a software developer from Indonesia. I am writing to you today to share a tribute project that is deeply inspired by one of your classic creations: the beloved desktop prayer times reminder, **Shollu** (2004–2012).

For a generation of Indonesian Muslims, Shollu was a trusted and pioneering companion on our Windows computers. To honor your contributions and ensure your work continues to serve the community, I and a group of developers have built a modern, open-source, and strictly non-commercial rebuild called **Shollu Modern**.

The project repository is hosted on GitHub:
👉 https://github.com/adenaufal/shollu-modern

To preserve the historical lineage and integrity of your work, we have carefully ported your original codebase structure:
1. Ported the core prayer time calculation algorithm directly from your legacy `Shollu.pas` (Delphi/Pascal) file into high-performance **Rust**.
2. Wrote a custom parser to support your original binary city/places database (`.spn`) and legacy language packs (`.slp`).
3. Modernized the user interface using a beautiful, clean, and responsive design system (**SolidJS + Tailwind CSS**) supporting light, dark, and warm sepia themes, alongside custom desktop widgets (`FloatingBar` & `DropZone`).

Your name as the original author and links to `ebsoft.web.id` are prominently credited on our application's **"About"** page and throughout all official repository documents. We will always honor and protect this attribution.

The project uses the *PolyForm Noncommercial 1.0.0* license. Version 1.0.0 is in the `main` branch and has been personally tested by the project owner, but the v1 public release has not been published. The Windows installer is 8.10 MiB and unsigned; signing work is deferred.

We would be absolutely honored if you could take a look at the project. Any feedback, advice, or suggestions you might have would be incredibly valuable to us.

Thank you so much for your classic creation which has inspired so many of us to write software that serves a higher purpose. May Allah SWT reward your past and present deeds with continuous blessings and prosperity.

Wassalamu'alaikum Warahmatullahi Wabarakatuh,

Sincerely yours,

**[Your Name]**  
[Your GitHub Profile / Contact Link]  
Contributors of Shollu Modern  
