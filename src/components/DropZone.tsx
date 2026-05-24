import { createSignal, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

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

function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function DropZone() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [tomorrowTimes, setTomorrowTimes] = createSignal<PrayerTimes | null>(null);

  const [nextPrayerName, setNextPrayerName] = createSignal<string>("--");
  const [nextPrayerTime, setNextPrayerTime] = createSignal<string>("--:--");
  const [countdownString, setCountdownString] = createSignal<string>("--:--:--");
  const [isHovered, setIsHovered] = createSignal<boolean>(false);
  
  let tickerInterval: any;

  const initData = async () => {
    try {
      const activeSettings = await invoke<AppSettings>("get_settings");
      setSettings(activeSettings);

      // Sync styles to document root
      if (activeSettings.skin && activeSettings.skin !== "default") {
        const parts = activeSettings.skin.split("-");
        if (parts.length === 2) {
          document.documentElement.setAttribute("data-theme", parts[0]);
          document.documentElement.setAttribute("data-accent", parts[1]);
        }
      }

      const today = new Date();
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

      const [currToday, tomorrow] = await Promise.all([
        fetchTimes(todayIso),
        fetchTimes(tomorrowIso)
      ]);

      setTodayTimes(currToday);
      setTomorrowTimes(tomorrow);

      startTicker(currToday, tomorrow);
    } catch (e) {
      console.error("DropZone data initialization failed:", e);
    }
  };

  const startTicker = (todayT: PrayerTimes, tomorrowT: PrayerTimes) => {
    if (tickerInterval) clearInterval(tickerInterval);

    const updateTicker = () => {
      const now = new Date();
      const currentDecimalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
      const todayHours = [todayT.fajr, todayT.sunrise, todayT.dhuhr, todayT.asr, todayT.maghrib, todayT.isha];
      const tomorrowHours = [tomorrowT.fajr, tomorrowT.sunrise, tomorrowT.dhuhr, tomorrowT.asr, tomorrowT.maghrib, tomorrowT.isha];

      let targetPrayerIdx = -1;
      let isTomorrow = false;

      for (let i = 0; i < todayHours.length; i++) {
        if (currentDecimalHours < todayHours[i]) {
          targetPrayerIdx = i;
          break;
        }
      }

      if (targetPrayerIdx === -1) {
        targetPrayerIdx = 0;
        isTomorrow = true;
      }

      setNextPrayerName(prayerNames[targetPrayerIdx]);

      const targetHours = isTomorrow ? tomorrowHours[targetPrayerIdx] : todayHours[targetPrayerIdx];
      setNextPrayerTime(formatHours(targetHours));

      const targetTimeTotalSecs = Math.floor(targetHours * 3600);
      const currentTimeTotalSecs = Math.floor(currentDecimalHours * 3600);

      let deltaSecs = targetTimeTotalSecs - currentTimeTotalSecs;
      if (isTomorrow) {
        deltaSecs = (86400 - currentTimeTotalSecs) + targetTimeTotalSecs;
      }

      if (deltaSecs < 0) deltaSecs = 0;

      const h = Math.floor(deltaSecs / 3600);
      const m = Math.floor((deltaSecs % 3600) / 60);
      const s = deltaSecs % 60;

      setCountdownString(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };

    updateTicker();
    tickerInterval = setInterval(updateTicker, 1000);
  };

  const handleClose = async () => {
    try {
      await invoke("toggle_drop_zone", { show: false });
    } catch (e) {
      console.error("Failed to close DropZone:", e);
    }
  };

  onMount(() => {
    initData();
  });

  onCleanup(() => {
    if (tickerInterval) clearInterval(tickerInterval);
  });

  return (
    <div
      data-tauri-drag-region
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      class="w-screen h-screen flex items-center justify-between px-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur rounded-xl shadow-lg relative overflow-hidden select-none select-none text-slate-800 dark:text-slate-200"
      style={{ "-webkit-app-region": "drag" } as any}
    >
      {/* Left section: Next label & target time */}
      <div data-tauri-drag-region class="flex flex-col text-left select-none space-y-0.5">
        <span data-tauri-drag-region class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {settings()?.language === "Indonesia" ? "Kiblat" : "Next"}
        </span>
        <span data-tauri-drag-region class="text-xs font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-none">
          {nextPrayerName()}
        </span>
        <span data-tauri-drag-region class="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-none">
          {nextPrayerTime()}
        </span>
      </div>

      {/* Right section: glowing countdown timer */}
      <div data-tauri-drag-region class="flex items-center select-none pr-1">
        <span data-tauri-drag-region class="text-lg font-extrabold text-teal-500 tabular tracking-tighter">
          {countdownString()}
        </span>
      </div>

      {/* Hover Overlay Close Action */}
      {isHovered() && (
        <button
          onClick={handleClose}
          style={{ "-webkit-app-region": "no-drag" } as any}
          class="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-400 text-[8px] font-bold text-slate-400 dark:text-slate-500 transition border-none cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
}
export default DropZone;
