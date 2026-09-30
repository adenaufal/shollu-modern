interface AboutPageProps {
  lang: string;
}

export function AboutPage(props: AboutPageProps) {
  return (
    <div class="page-stack animate-fade-in" style={{ "text-align": "center" }}>
      <div class="about-hero">
        <div class="about-icon">
          <img src="/icon-128.png" alt="Shollu Modern" width="64" height="64" />
        </div>
        <h2 class="about-title">Shollu Modern</h2>
        <p class="about-ver">v0.1.0-alpha · PolyForm Noncommercial 1.0.0</p>
      </div>

      <div class="about-credit">
        <div class="about-credit-title">
          {props.lang === "Indonesia"
            ? "Berdasarkan karya"
            : "Based on work by"}
        </div>
        <h3 class="about-credit-name">Ebta Setiawan</h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            "margin-top": "4px",
            "align-items": "center",
            "justify-content": "center",
          }}
        >
          <a
            class="about-credit-link"
            href="https://ebsoft.web.id"
            target="_blank"
            rel="noreferrer"
          >
            ebsoft.web.id
          </a>
          <span class="text-subtle" aria-hidden="true">
            ·
          </span>
          <a
            class="about-credit-link"
            href="https://github.com/ebta/shollu"
            target="_blank"
            rel="noreferrer"
          >
            github.com/ebta/shollu
          </a>
        </div>
        <p class="about-body" style={{ "margin-top": "12px" }}>
          {props.lang === "Indonesia"
            ? "Shollu mula-mula dikembangkan dari tahun 2004 hingga 2012 oleh Ebta Setiawan sebagai aplikasi pengingat waktu sholat freeware yang legendaris untuk platform Windows. Program aslinya ditulis dalam Delphi dengan pustaka KOL, menghasilkan executable mandiri super efisien berukuran hanya ~276 KB."
            : "Shollu was originally developed from 2004 to 2012 by Ebta Setiawan as a legendary freeware prayer-times reminder application for the Windows platform. The original program was written in Delphi using the KOL library, producing a super-efficient self-contained executable of just ~276 KB."}
        </p>
      </div>

      <div class="about-credit">
        <div class="about-credit-title">
          {props.lang === "Indonesia"
            ? "Modernisasi Komunitas"
            : "Community Rebuild"}
        </div>
        <p class="about-body">
          {props.lang === "Indonesia"
            ? "Shollu Modern adalah reimplementasi open-source berbasis komunitas yang dibangun menggunakan Tauri 2 + SolidJS untuk sistem operasi Windows, macOS, dan Linux. Akurasi kalkulasi waktu sholat telah divalidasi penuh terhadap aplikasi Shollu v3.10 asli dengan selisih maksimum hanya 11 detik."
            : "Shollu Modern is a community-driven, open-source modernization built using Tauri 2 + SolidJS for Windows, macOS, and Linux. The prayer time calculation algorithms have been fully validated against the original Shollu v3.10 with a maximum deviation of only 11 seconds."}
        </p>
      </div>

      <div style={{ "padding-top": "8px" }}>
        <a
          href="https://github.com/adenaufal/shollu-modern"
          target="_blank"
          rel="noreferrer"
          class="btn btn-secondary"
        >
          {props.lang === "Indonesia"
            ? "Kunjungi Repositori"
            : "Visit Repository"}
        </a>
      </div>
    </div>
  );
}
