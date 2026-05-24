import { createSignal, onMount, onCleanup, createEffect, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { QiblaCompass } from "./QiblaCompass";

interface MainPageProps {
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
  pembulatan: number;
  language: string;
  skin: string;
}

interface PrayerTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface HijriDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

const H_MONTHS_ID = [
  "Muharram", "Safar", "Rabi'ul Awal", "Rabi'ul Akhir", "Jumadil Awal", "Jumadil Akhir",
  "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
];

const H_MONTHS_EN = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
  "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

const WEEKDAYS_ID = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const G_DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const G_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const G_MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
];

const G_MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function MainPage(props: MainPageProps) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  
  // 3-Day prayer times records
  const [yesterdayTimes, setYesterdayTimes] = createSignal<PrayerTimes | null>(null);
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [tomorrowTimes, setTomorrowTimes] = createSignal<PrayerTimes | null>(null);

  // Mecca bearing and Hijri dates
  const [qiblaAngle, setQiblaAngle] = createSignal<number>(293.81);
  const [qiblaCardinal, setQiblaCardinal] = createSignal<string>("W-NW");
  const [hijriToday, setHijriToday] = createSignal<HijriDate | null>(null);

  // Live countdown timer ticker states
  const [nextPrayerName, setNextPrayerName] = createSignal<string>("Asr");
  const [countdownString, setCountdownString] = createSignal<string>("--:--:--");
  const [currentPrayerName, setCurrentPrayerName] = createSignal<string>("Dhuhr");

  let tickerInterval: any;

  // Initialize and load everything
  const initMainPageData = async () => {
    try {
      const activeSettings = await invoke<AppSettings>("get_settings");
      setSettings(activeSettings);

      // 1. Fetch Hijri calendar today
      const today = new Date();
      const hijri = await invoke<HijriDate>("convert_gregorian_to_hijri", {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        adjustment: 0
      });
      setHijriToday(hijri);

      // 2. Fetch Qibla bearing towards Mecca
      const qibla = await invoke<{ degrees: number; cardinal: string }>("qibla_bearing", {
        latitude: activeSettings.location.latitude,
        longitude: activeSettings.location.longitude
      });
      setQiblaAngle(qibla.degrees);
      setQiblaCardinal(qibla.cardinal);

      // 3. Fetch 3-Day Prayer times grid
      const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const todayIso = today.toISOString().split("T")[0];
      const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      const fetchTimes = async (dateIso: string) => {
        return invoke<PrayerTimes>("compute_prayer_times", {
          dateIso,
          latitude: activeSettings.location.latitude,
          longitude: activeSettings.location.longitude,
          altitude: activeSettings.location.altitude,
          timezone: activeSettings.location.timezone,
          methodId: activeSettings.method,
          madhabId: activeSettings.madhab,
          fajrAngle: null,
          ishaAngle: null,
          adjustments: activeSettings.adjustments
        });
      };

      const [yesterday, currToday, tomorrow] = await Promise.all([
        fetchTimes(yesterdayIso),
        fetchTimes(todayIso),
        fetchTimes(tomorrowIso)
      ]);

      setYesterdayTimes(yesterday);
      setTodayTimes(currToday);
      setTomorrowTimes(tomorrow);

      // Start ticking
      startCountdownTicker(currToday, tomorrow);
    } catch (e) {
      console.error("Main page data initialization failed:", e);
    }
  };

  // Ticker loop mapping live countdown timers
  const startCountdownTicker = (todayT: PrayerTimes, tomorrowT: PrayerTimes) => {
    if (tickerInterval) clearInterval(tickerInterval);

    const updateTicker = () => {
      const now = new Date();
      const currentDecimalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      // Map today's prayer times as decimal hours
      const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
      const todayHours = [todayT.fajr, todayT.sunrise, todayT.dhuhr, todayT.asr, todayT.maghrib, todayT.isha];
      const tomorrowHours = [tomorrowT.fajr, tomorrowT.sunrise, tomorrowT.dhuhr, tomorrowT.asr, tomorrowT.maghrib, tomorrowT.isha];

      let targetPrayerIdx = -1;
      let isTomorrow = false;

      // Find the soonest upcoming prayer today
      for (let i = 0; i < todayHours.length; i++) {
        if (currentDecimalHours < todayHours[i]) {
          targetPrayerIdx = i;
          break;
        }
      }

      // If all of today's prayers have passed, target Fajr tomorrow!
      if (targetPrayerIdx === -1) {
        targetPrayerIdx = 0; // Fajr
        isTomorrow = true;
      }

      const targetName = prayerNames[targetPrayerIdx];
      setNextPrayerName(targetName);

      // Determine active current prayer (the last one whose time passed)
      let currentIdx = -1;
      for (let i = todayHours.length - 1; i >= 0; i--) {
        if (currentDecimalHours >= todayHours[i]) {
          currentIdx = i;
          break;
        }
      }
      if (currentIdx === -1) {
        // If before Fajr today, current active is Isha yesterday
        setCurrentPrayerName("Isha");
      } else {
        setCurrentPrayerName(prayerNames[currentIdx]);
      }

      // Calculate time difference in absolute seconds
      const targetHours = isTomorrow ? tomorrowHours[targetPrayerIdx] : todayHours[targetPrayerIdx];
      const targetTimeTotalSecs = Math.floor(targetHours * 3600);
      const currentTimeTotalSecs = Math.floor(currentDecimalHours * 3600);

      let deltaSecs = targetTimeTotalSecs - currentTimeTotalSecs;
      if (isTomorrow) {
        // Remaining time today + target time tomorrow
        deltaSecs = (86400 - currentTimeTotalSecs) + targetTimeTotalSecs;
      }

      if (deltaSecs < 0) deltaSecs = 0;

      const h = Math.floor(deltaSecs / 3600);
      const m = Math.floor((deltaSecs % 3600) / 60);
      const s = deltaSecs % 60;

      setCountdownString(
        `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
      );
    };

    updateTicker();
    tickerInterval = setInterval(updateTicker, 1000);
  };

  onMount(() => {
    initMainPageData();
  });

  onCleanup(() => {
    if (tickerInterval) clearInterval(tickerInterval);
  });

  // Date Formatting helper
  const getFormattedGregDate = () => {
    const d = new Date();
    const wday = props.lang === "Indonesia" ? G_DAYS_ID[d.getDay()] : G_DAYS_EN[d.getDay()];
    const mon = props.lang === "Indonesia" ? G_MONTHS_ID[d.getMonth()] : G_MONTHS_EN[d.getMonth()];
    return `${wday}, ${d.getDate()} ${mon} ${d.getFullYear()}`;
  };

  const getFormattedHijriDate = () => {
    const h = hijriToday();
    if (!h) return "-- -- ----";
    const monName = props.lang === "Indonesia" ? H_MONTHS_ID[h.month - 1] : H_MONTHS_EN[h.month - 1];
    return `${h.day} ${monName} ${h.year} H`;
  };

  const getMethodName = (id: number) => {
    switch (id) {
      case 1: return "Karachi";
      case 2: return "ISNA";
      case 3: return "MWL";
      case 4: return "Umm Al-Qura";
      case 5: return "Egypt";
      default: return "ISNA";
    }
  };

  return (
    <div class="animate-fade-in space-y-4">
      
      {/* Top Location strip */}
      <div class="location-strip select-none flex justify-between items-start border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
        <div class="select-none text-left">
          <div class="location-name text-sm font-bold text-slate-800 dark:text-slate-200">
            {settings()?.location.name ?? "Jakarta"}, Indonesia
          </div>
          <div class="location-coords text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 select-none">
            {settings()?.location.latitude.toFixed(4)}°, {settings()?.location.longitude.toFixed(4)}° 
            {" · "}{settings()?.location.altitude} m · UTC+{settings()?.location.timezone.toFixed(0)}
          </div>
        </div>
        <div class="date-display select-none text-right">
          <div class="date-greg text-sm font-bold text-slate-800 dark:text-slate-200">
            {getFormattedGregDate()}
          </div>
          <div class="date-hijri text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 select-none">
            {getFormattedHijriDate()}
          </div>
        </div>
      </div>

      {/* Hero Countdown Panel */}
      <div class="hero-section select-none rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center shadow">
        <div class="text-left select-none space-y-1">
          <div class="hero-eyebrow select-none text-[10px] font-bold tracking-wider text-teal-600 dark:text-teal-400 uppercase flex items-center gap-1.5">
            {props.lang === "Indonesia" ? "Waktu Sholat Berikutnya" : "Next Prayer"}
            <span class="hero-gold-dot" />
          </div>
          <div class="hero-main select-none flex items-baseline gap-3">
            <span class="hero-prayer text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {nextPrayerName()}
            </span>
            <span class="hero-countdown text-3xl font-extrabold text-teal-500 tabular select-none">
              {countdownString()}
            </span>
          </div>
          <div class="hero-time text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
            {props.lang === "Indonesia" ? "Aktif saat ini:" : "Current prayer:"} <span class="text-slate-600 dark:text-slate-300 font-bold">{currentPrayerName()}</span>
            {" · "}{getMethodName(settings()?.method ?? 2)} · {settings()?.madhab === 2 ? "Hanafi" : "Shafi'i"}
          </div>
        </div>

        {/* Qibla mini compass */}
        <div class="qibla-mini select-none flex flex-col items-center gap-1">
          <span class="qibla-label text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
            {props.lang === "Indonesia" ? "Kiblat" : "Qibla"}
          </span>
          <QiblaCompass deg={qiblaAngle()} size={52} />
          <span class="qibla-deg text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
            {qiblaAngle().toFixed(1)}° {qiblaCardinal()}
          </span>
        </div>
      </div>

      {/* Grid of prayer times */}
      <Show when={todayTimes()}>
        <div class="prayer-grid border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div class="prayer-grid-header grid text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/20 border-bottom border-slate-200 dark:border-slate-800 select-none">
            <div class="gh-cell">{props.lang === "Indonesia" ? "Sholat" : "Prayer"}</div>
            <div class="gh-cell">{props.lang === "Indonesia" ? "Kemarin" : "Yesterday"}</div>
            <div class="gh-cell today">{props.lang === "Indonesia" ? "Hari Ini" : "Today"}</div>
            <div class="gh-cell">{props.lang === "Indonesia" ? "Besok" : "Tomorrow"}</div>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-slate-800 select-none">
            {(
              [
                ["Fajr", yesterdayTimes()?.fajr, todayTimes()?.fajr, tomorrowTimes()?.fajr],
                ["Sunrise", yesterdayTimes()?.sunrise, todayTimes()?.sunrise, tomorrowTimes()?.sunrise],
                ["Dhuhr", yesterdayTimes()?.dhuhr, todayTimes()?.dhuhr, tomorrowTimes()?.dhuhr],
                ["Asr", yesterdayTimes()?.asr, todayTimes()?.asr, tomorrowTimes()?.asr],
                ["Maghrib", yesterdayTimes()?.maghrib, todayTimes()?.maghrib, tomorrowTimes()?.maghrib],
                ["Isha", yesterdayTimes()?.isha, todayTimes()?.isha, tomorrowTimes()?.isha]
              ] as const
            ).map(([name, yest, tod, tmrw]) => {
              const isNext = () => nextPrayerName() === name;
              const isDone = () => {
                // If it is Sunrise, Sunrise is technically done if current active is Dhuhr or later
                if (currentPrayerName() === name) return false; // currently active
                const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
                const currIdx = prayerNames.indexOf(currentPrayerName());
                const nameIdx = prayerNames.indexOf(name);
                return currIdx > nameIdx;
              };

              return (
                <div class={`prayer-row grid text-slate-800 dark:text-slate-200 select-none ${isNext() ? "is-next" : ""}`}>
                  <div class="gr-cell name font-semibold text-slate-500 dark:text-slate-400">
                    {name}
                  </div>
                  <div class="gr-cell text-slate-400 dark:text-slate-500 select-none">
                    {yest ? formatHours(yest) : "--:--"}
                  </div>
                  <div class="gr-cell select-none">
                    {isNext() && <span class="next-dot animate-pulse" />}
                    <span class={isNext() ? "next-time text-teal-600 dark:text-teal-400 font-bold" : ""}>
                      {tod ? formatHours(tod) : "--:--"}
                    </span>
                    {isDone() && <span class="done-check text-slate-400 font-semibold select-none">✓</span>}
                  </div>
                  <div class="gr-cell text-slate-400 dark:text-slate-500 select-none">
                    {tmrw ? formatHours(tmrw) : "--:--"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Show>

    </div>
  );
}
