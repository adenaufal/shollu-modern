interface AboutPageProps {
  lang: string;
  t: (key: string, fallback: string) => string;
}

export function AboutPage(props: AboutPageProps) {
  return (
    <div class="content-scroll animate-fade-in text-center max-w-xl mx-auto space-y-6">
      {/* Branding Hero */}
      <div class="about-hero select-none">
        <div class="about-icon bg-white p-2 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 inline-block">
          <img src="/icon-128.png" alt="Shollu Modern" class="w-16 h-16 object-contain" />
        </div>
        <h2 class="about-title mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Shollu Modern
        </h2>
        <p class="about-ver text-xs text-slate-500 mt-1">
          v0.1.0-alpha · PolyForm Noncommercial 1.0.0
        </p>
      </div>

      {/* Ebta Setiawan Credit Card */}
      <div class="about-credit card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 text-left shadow-sm">
        <div class="about-credit-title text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
          {props.lang === "Indonesia" ? "Berdasarkan karya" : "Based on work by"}
        </div>
        <h3 class="about-credit-name text-lg font-semibold text-slate-900 dark:text-slate-100">
          Ebta Setiawan
        </h3>
        <div class="flex gap-3 mt-1 select-none">
          <a
            class="about-credit-link text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            href="https://ebsoft.web.id"
            target="_blank"
            rel="noreferrer"
          >
            ebsoft.web.id
          </a>
          <span class="text-slate-300 dark:text-slate-700">·</span>
          <a
            class="about-credit-link text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            href="https://github.com/ebta/shollu"
            target="_blank"
            rel="noreferrer"
          >
            github.com/ebta/shollu
          </a>
        </div>
        <p class="about-body text-sm leading-relaxed text-slate-500 dark:text-slate-400 mt-3">
          {props.lang === "Indonesia"
            ? "Shollu mula-mula dikembangkan dari tahun 2004 hingga 2012 oleh Ebta Setiawan sebagai aplikasi pengingat waktu sholat freeware yang legendaris untuk platform Windows. Program aslinya ditulis dalam Delphi dengan pustaka KOL, menghasilkan executable mandiri super efisien berukuran hanya ~276 KB."
            : "Shollu was originally developed from 2004 to 2012 by Ebta Setiawan as a legendary freeware prayer-times reminder application for the Windows platform. The original program was written in Delphi using the KOL library, producing a super-efficient self-contained executable of just ~276 KB."}
        </p>
      </div>

      {/* Reimplementation Details Card */}
      <div class="about-credit card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 text-left shadow-sm">
        <div class="about-credit-title text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
          {props.lang === "Indonesia" ? "Modernisasi Komunitas" : "Community Rebuild"}
        </div>
        <p class="about-body text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {props.lang === "Indonesia"
            ? "Shollu Modern adalah reimplementasi open-source berbasis komunitas yang dibangun menggunakan Tauri 2 + SolidJS untuk sistem operasi Windows, macOS, dan Linux. Akurasi kalkulasi waktu sholat telah divalidasi penuh terhadap aplikasi Shollu v3.10 asli dengan selisih maksimum hanya 11 detik."
            : "Shollu Modern is a community-driven, open-source modernization built using Tauri 2 + SolidJS for Windows, macOS, and Linux. The prayer time calculation algorithms have been fully validated against the original Shollu v3.10 with a maximum deviation of only 11 seconds."}
        </p>
      </div>

      {/* Help Link */}
      <div class="pt-4 select-none">
        <a
          href="https://github.com/adenaufal/shollu-modern"
          target="_blank"
          rel="noreferrer"
          class="btn btn-secondary text-xs select-none inline-flex items-center gap-2"
        >
          {props.lang === "Indonesia" ? "Kunjungi Repositori" : "Visit Repository"}
        </a>
      </div>
    </div>
  );
}
