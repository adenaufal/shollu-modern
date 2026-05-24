import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { QiblaCompass } from "./QiblaCompass";
import {
  formatHours,
  H_MONTHS_ID, H_MONTHS_EN,
  WEEKDAYS_ID, WEEKDAYS_EN,
  G_DAYS_ID, G_DAYS_EN,
  G_MONTHS_ID, G_MONTHS_EN,
  PRAYER_NAMES,
  getMethodName
} from "../helpers";
import type { AppSettings, PrayerTimes, HijriDate } from "../helpers";

interface MainPageProps {
  lang: string;
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

  // Loading state
  const [loading, setLoading] = createSignal<boolean>(true);

  let tickerInterval: ReturnType<typeof setInterval> | undefined;

  // Initialize and load everything
  const initMainPageData = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Ticker loop mapping live countdown timers
  const startCountdownTicker = (todayT: PrayerTimes, tomorrowT: PrayerTimes) => {
    if (tickerInterval) clearInterval(tickerInterval);

    const updateTicker = () => {
      const now = new Date();
      const currentDecimalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      // Map today's prayer times as decimal hours
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

      const targetName = PRAYER_NAMES[targetPrayerIdx];
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
        setCurrentPrayerName(PRAYER_NAMES[currentIdx]);
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

  return (
    <div class="animate-fade-in space-y-4">

      {/* Top Location strip */}
      <div class="location-strip flex justify-between items-start border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
        <div class="text-left">
          <div class="location-name text-sm font-bold text-slate-800 dark:text-slate-200">
            {settings()?.location.name ?? (props.lang === "Indonesia" ? "Lokasi tidak tersedia" : "Location unavailable")}
          </div>
          <div class="location-coords text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            {settings()
              ? `${settings()!.location.latitude.toFixed(4)}°, ${settings()!.location.longitude.toFixed(4)}° · ${settings()!.location.altitude} m · UTC+${settings()!.location.timezone.toFixed(0)}`
              : (props.lang === "Indonesia" ? "Memuat..." : "Loading...")}
          </div>
        </div>
        <div class="date-display text-right">
          <div class="date-greg text-sm font-bold text-slate-800 dark:text-slate-200">
            {getFormattedGregDate()}
          </div>
          <div class="date-hijri text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            {getFormattedHijriDate()}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      <Show when={loading()}>
        <div class="space-y-4 animate-pulse">
          <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900">
            <div class="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div class="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div class="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div class="h-8 bg-slate-100 dark:bg-slate-800 rounded-t-xl" />
            {Array.from({ length: 6 }).map(() => (
              <div class="h-12 border-t border-slate-100 dark:border-slate-800" />
            ))}
          </div>
        </div>
      </Show>

      {/* Hero Countdown Panel */}
      <Show when={!loading()}>
        <div class="hero-section rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center shadow-sm">
          <div class="text-left space-y-1">
            <div class="hero-eyebrow flex items-center gap-1.5">
              {props.lang === "Indonesia" ? "Waktu Sholat Berikutnya" : "Next Prayer"}
              <span class="hero-gold-dot" />
            </div>
            <div class="hero-main flex items-baseline gap-3">
              <span class="hero-prayer">
                {nextPrayerName()}
              </span>
              <span class="hero-countdown tabular">
                {countdownString()}
              </span>
            </div>
            <div class="hero-time text-xs font-semibold text-slate-400 dark:text-slate-500">
              {props.lang === "Indonesia" ? "Aktif saat ini:" : "Current prayer:"} <span class="hero-current-prayer">{currentPrayerName()}</span>
              {" · "}{getMethodName(settings()?.method ?? 2)} · {settings()?.madhab === 2 ? "Hanafi" : "Shafi'i"}
            </div>
          </div>

          {/* Qibla mini compass */}
          <div class="qibla-mini flex flex-col items-center gap-1">
            <span class="qibla-label">
              {props.lang === "Indonesia" ? "Kiblat" : "Qibla"}
            </span>
            <QiblaCompass deg={qiblaAngle()} size={52} />
            <span class="qibla-deg">
              {qiblaAngle().toFixed(1)}° {qiblaCardinal()}
            </span>
          </div>
        </div>
      </Show>

      {/* Grid of prayer times */}
      <Show when={todayTimes()}>
        <div class="prayer-grid border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div class="prayer-grid-header grid text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/20 border-bottom border-slate-200 dark:border-slate-800">
            <div class="gh-cell">{props.lang === "Indonesia" ? "Sholat" : "Prayer"}</div>
            <div class="gh-cell">{props.lang === "Indonesia" ? "Kemarin" : "Yesterday"}</div>
            <div class="gh-cell today">{props.lang === "Indonesia" ? "Hari Ini" : "Today"}</div>
            <div class="gh-cell">{props.lang === "Indonesia" ? "Besok" : "Tomorrow"}</div>
          </div>

          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            {(PRAYER_NAMES as readonly string[]).map((name) => {
              const idx = PRAYER_NAMES.indexOf(name);
              const timeKeys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
              const key = timeKeys[idx];
              const yest = yesterdayTimes()?.[key];
              const tod = todayTimes()?.[key];
              const tmrw = tomorrowTimes()?.[key];

              const isNext = () => nextPrayerName() === name;
              const isDone = () => {
                if (currentPrayerName() === name) return false;
                const currIdx = PRAYER_NAMES.indexOf(currentPrayerName());
                const nameIdx = PRAYER_NAMES.indexOf(name);
                return currIdx > nameIdx;
              };

              return (
                <div class={`prayer-row grid text-slate-800 dark:text-slate-200 ${isNext() ? "is-next" : ""}`}>
                  <div class="gr-cell name font-semibold text-slate-500 dark:text-slate-400">
                    {name === "Sunrise" && props.lang === "Indonesia" ? "Syuruq" : name}
                  </div>
                  <div class="gr-cell text-slate-400 dark:text-slate-500">
                    {yest != null ? formatHours(yest) : "--:--"}
                  </div>
                  <div class="gr-cell">
                    {isNext() && <span class="next-dot animate-pulse" />}
                    <span class={isNext() ? "next-time" : ""}>
                      {tod != null ? formatHours(tod) : "--:--"}
                    </span>
                    {isDone() && <span class="done-check text-slate-400 font-semibold">✓</span>}
                  </div>
                  <div class="gr-cell text-slate-400 dark:text-slate-500">
                    {tmrw != null ? formatHours(tmrw) : "--:--"}
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
