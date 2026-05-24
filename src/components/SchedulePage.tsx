import { createSignal, createEffect, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

interface SchedulePageProps {
  lang: string;
}

interface LocationSettings {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: number;
}

interface Adjustments {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface AppSettings {
  location: LocationSettings;
  method: number;
  madhab: number;
  adjustments: Adjustments;
}

interface PrayerTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface DayPrayerTimes {
  dateIso: string;
  times: PrayerTimes;
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function SchedulePage(props: SchedulePageProps) {
  const today = new Date();
  const defaultYear = today.getFullYear();
  const defaultMonth = String(today.getMonth() + 1).padStart(2, "0");

  const [startDate, setStartDate] = createSignal<string>(`${defaultYear}-${defaultMonth}-01`);
  
  // Get last day of current month
  const lastDay = new Date(defaultYear, today.getMonth() + 1, 0).getDate();
  const [endDate, setEndDate] = createSignal<string>(`${defaultYear}-${defaultMonth}-${String(lastDay).padStart(2, "0")}`);

  const [schedule, setSchedule] = createSignal<DayPrayerTimes[]>([]);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [settings, setSettings] = createSignal<AppSettings | null>(null);

  // Load active location settings at startup
  const fetchSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      setSettings(res);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  // Generate the list of dates and fetch their prayer times
  const generateSchedule = async () => {
    const locSettings = settings();
    if (!locSettings) return;

    setLoading(true);
    try {
      const start = new Date(startDate());
      const end = new Date(endDate());
      
      const dates: string[] = [];
      const curr = new Date(start);
      while (curr <= end) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
      }

      // Fetch in parallel for ultimate speed
      const results = await Promise.all(
        dates.map(async (dateIso) => {
          const times = await invoke<PrayerTimes>("compute_prayer_times", {
            dateIso,
            latitude: locSettings.location.latitude,
            longitude: locSettings.location.longitude,
            altitude: locSettings.location.altitude,
            timezone: locSettings.location.timezone,
            methodId: locSettings.method,
            madhabId: locSettings.madhab,
            fajrAngle: null,
            ishaAngle: null,
            adjustments: locSettings.adjustments
          });
          return { dateIso, times };
        })
      );

      setSchedule(results);
    } catch (e) {
      console.error("Failed to generate prayer times schedule:", e);
    } finally {
      setLoading(false);
    }
  };

  createEffect(async () => {
    await fetchSettings();
    generateSchedule();
  });

  // Export Monthly Schedule as CSV
  const handleExportCSV = () => {
    const list = schedule();
    if (list.length === 0) return;

    let csvContent = "Date,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha\n";
    for (const item of list) {
      csvContent += `${item.dateIso},${formatHours(item.times.fajr)},${formatHours(item.times.sunrise)},${formatHours(item.times.dhuhr)},${formatHours(item.times.asr)},${formatHours(item.times.maghrib)},${formatHours(item.times.isha)}\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Shollu_Schedule_${startDate()}_to_${endDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Monthly Schedule as beautiful print-ready HTML
  const handleExportHTML = () => {
    const list = schedule();
    if (list.length === 0) return;

    const locName = settings()?.location.name ?? "Custom Location";

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prayer Schedule for ${locName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-variant-numeric: tabular-nums; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>Prayer Times Schedule</h1>
  <div class="meta">${locName} · Period: ${startDate()} to ${endDate()}</div>
  <button onclick="window.print()" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">Print Schedule</button>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Fajr</th>
        <th>Sunrise</th>
        <th>Dhuhr</th>
        <th>Asr</th>
        <th>Maghrib</th>
        <th>Isha</th>
      </tr>
    </thead>
    <tbody>
    `;

    for (const item of list) {
      htmlContent += `
      <tr>
        <td><strong>${item.dateIso}</strong></td>
        <td>${formatHours(item.times.fajr)}</td>
        <td>${formatHours(item.times.sunrise)}</td>
        <td>${formatHours(item.times.dhuhr)}</td>
        <td>${formatHours(item.times.asr)}</td>
        <td>${formatHours(item.times.maghrib)}</td>
        <td>${formatHours(item.times.isha)}</td>
      </tr>
      `;
    }

    htmlContent += `
    </tbody>
  </table>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Fallback download if popup is blocked
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Shollu_Schedule_${locName}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div class="content-scroll animate-fade-in space-y-4">
      {/* Date selector options Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
        <h3 class="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Rentang Tanggal" : "Date Range"}
        </h3>
        
        <div class="field-row">
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Dari Tanggal" : "From"}</span>
            <input
              type="date"
              value={startDate()}
              onInput={(e) => setStartDate(e.currentTarget.value)}
              class="field-input text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Sampai Tanggal" : "To"}</span>
            <input
              type="date"
              value={endDate()}
              onInput={(e) => setEndDate(e.currentTarget.value)}
              class="field-input text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div class="flex gap-2 select-none">
          <button
            onClick={generateSchedule}
            disabled={loading()}
            class="btn btn-primary select-none text-xs font-semibold px-4 py-2"
          >
            {loading()
              ? (props.lang === "Indonesia" ? "Memuat..." : "Generating...")
              : (props.lang === "Indonesia" ? "Tampilkan Jadwal" : "Generate Schedule")}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={schedule().length === 0}
            class="btn btn-secondary select-none text-xs font-semibold px-4 py-2"
          >
            {props.lang === "Indonesia" ? "Ekspor CSV" : "Export CSV"}
          </button>
          <button
            onClick={handleExportHTML}
            disabled={schedule().length === 0}
            class="btn btn-secondary select-none text-xs font-semibold px-4 py-2"
          >
            {props.lang === "Indonesia" ? "Cetak HTML" : "Print HTML"}
          </button>
        </div>
      </div>

      {/* Grid of Results */}
      <Show when={schedule().length > 0}>
        <div class="prayer-grid border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div
            class="prayer-grid-header grid text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/20 border-bottom border-slate-200 dark:border-slate-800 select-none"
            style={{ "grid-template-columns": "110px repeat(6, 1fr)" }}
          >
            <div class="gh-cell">{props.lang === "Indonesia" ? "Tanggal" : "Date"}</div>
            <div class="gh-cell">Fajr</div>
            <div class="gh-cell">Shurook</div>
            <div class="gh-cell">Dhuhr</div>
            <div class="gh-cell">Asr</div>
            <div class="gh-cell">Maghrib</div>
            <div class="gh-cell">Isha</div>
          </div>

          <div class="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <For each={schedule()}>
              {(day) => (
                <div
                  class="prayer-row grid text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  style={{ "grid-template-columns": "110px repeat(6, 1fr)" }}
                >
                  <div class="gr-cell font-bold text-xs text-slate-500 dark:text-slate-400">
                    {day.dateIso}
                  </div>
                  <div class="gr-cell">{formatHours(day.times.fajr)}</div>
                  <div class="gr-cell">{formatHours(day.times.sunrise)}</div>
                  <div class="gr-cell">{formatHours(day.times.dhuhr)}</div>
                  <div class="gr-cell">{formatHours(day.times.asr)}</div>
                  <div class="gr-cell">{formatHours(day.times.maghrib)}</div>
                  <div class="gr-cell">{formatHours(day.times.isha)}</div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
