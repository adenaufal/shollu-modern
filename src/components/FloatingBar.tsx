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

export function FloatingBar() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [tomorrowTimes, setTomorrowTimes] = createSignal<PrayerTimes | null>(null);

  const [nextPrayerName, setNextPrayerName] = createSignal<string>("--");
  const [countdownString, setCountdownString] = createSignal<string>("--:--:--");
  
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
      console.error("FloatingBar data initialization failed:", e);
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
      await invoke("toggle_floating_bar", { show: false });
    } catch (e) {
      console.error("Failed to close FloatingBar:", e);
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
      class="w-screen h-screen flex items-center justify-between px-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-lg overflow-hidden select-none select-none text-slate-800 dark:text-slate-200"
      style={{ "-webkit-app-region": "drag" } as any}
    >
      {/* Brand & Location */}
      <div data-tauri-drag-region class="flex items-center gap-2">
        <img data-tauri-drag-region src="/icon-32.png" alt="" class="w-5 h-5 rounded" />
        <span data-tauri-drag-region class="text-xs font-bold tracking-tight">
          Shollu · <span class="text-teal-600 dark:text-teal-400">{settings()?.location.name ?? "Pekanbaru"}</span>
        </span>
      </div>

      {/* Countdown strip */}
      <div data-tauri-drag-region class="flex items-center gap-2 font-semibold text-xs text-slate-700 dark:text-slate-300">
        <span data-tauri-drag-region>{settings()?.language === "Indonesia" ? "Berikutnya" : "Next"}: <span class="font-bold text-teal-600 dark:text-teal-400">{nextPrayerName()}</span></span>
        <span data-tauri-drag-region class="font-bold tabular text-teal-500 text-sm tracking-tight">{countdownString()}</span>
      </div>

      {/* Compact times strip */}
      <div data-tauri-drag-region class="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500">
        <Show when={todayTimes()}>
          {(times) => (
            <>
              <span data-tauri-drag-region class={nextPrayerName() === "Fajr" ? "text-teal-600 dark:text-teal-400 font-extrabold" : ""}>
                Fajr {formatHours(times().fajr)}
              </span>
              <span data-tauri-drag-region class={nextPrayerName() === "Dhuhr" ? "text-teal-600 dark:text-teal-400 font-extrabold" : ""}>
                Dhuhr {formatHours(times().dhuhr)}
              </span>
              <span data-tauri-drag-region class={nextPrayerName() === "Asr" ? "text-teal-600 dark:text-teal-400 font-extrabold" : ""}>
                Asr {formatHours(times().asr)}
              </span>
              <span data-tauri-drag-region class={nextPrayerName() === "Maghrib" ? "text-teal-600 dark:text-teal-400 font-extrabold" : ""}>
                Maghrib {formatHours(times().maghrib)}
              </span>
              <span data-tauri-drag-region class={nextPrayerName() === "Isha" ? "text-teal-600 dark:text-teal-400 font-extrabold" : ""}>
                Isha {formatHours(times().isha)}
              </span>
            </>
          )}
        </Show>

        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{ "-webkit-app-region": "no-drag" } as any}
          class="text-xs font-bold text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition ml-2 border-none bg-transparent cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
export default FloatingBar;
