import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import {
  formatHours,
  PRAYER_NAMES,
  toLocalDateIso,
  addLocalDays,
} from "../helpers";
import type { AppSettings, PrayerTimes } from "../helpers";

export function DropZone() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [nextPrayerName, setNextPrayerName] = createSignal<string>("—");
  const [nextPrayerTime, setNextPrayerTime] = createSignal<string>("--:--");
  const [countdownString, setCountdownString] =
    createSignal<string>("--:--:--");
  const [isHovered, setIsHovered] = createSignal<boolean>(false);

  let tickerInterval: ReturnType<typeof setInterval> | undefined;

  const initData = async () => {
    try {
      const activeSettings = await invoke<AppSettings>("get_settings");
      setSettings(activeSettings);

      if (activeSettings.skin && activeSettings.skin !== "default") {
        const parts = activeSettings.skin.split("-");
        if (parts.length === 2) {
          document.documentElement.setAttribute("data-theme", parts[0]);
          document.documentElement.setAttribute("data-accent", parts[1]);
        }
      }

      const today = new Date();
      const todayIso = toLocalDateIso(today);
      const tomorrowIso = toLocalDateIso(addLocalDays(today, 1));

      const fetchTimes = (dateIso: string) =>
        invoke<PrayerTimes>("compute_prayer_times", {
          dateIso,
          latitude: activeSettings.location.latitude,
          longitude: activeSettings.location.longitude,
          altitude: activeSettings.location.altitude,
          timezone: activeSettings.location.timezone,
          methodId: activeSettings.method,
          madhabId: activeSettings.madhab,
          fajrAngle: null,
          ishaAngle: null,
          adjustments: activeSettings.adjustments,
        });

      const [currToday, tomorrow] = await Promise.all([
        fetchTimes(todayIso),
        fetchTimes(tomorrowIso),
      ]);

      startTicker(currToday, tomorrow);
    } catch (e) {
      console.error("DropZone data initialization failed:", e);
    }
  };

  const startTicker = (todayT: PrayerTimes, tomorrowT: PrayerTimes) => {
    if (tickerInterval) clearInterval(tickerInterval);

    const updateTicker = () => {
      const now = new Date();
      const currentDecimalHours =
        now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

      const todayHours = [
        todayT.fajr,
        todayT.sunrise,
        todayT.dhuhr,
        todayT.asr,
        todayT.maghrib,
        todayT.isha,
      ];
      const tomorrowHours = [
        tomorrowT.fajr,
        tomorrowT.sunrise,
        tomorrowT.dhuhr,
        tomorrowT.asr,
        tomorrowT.maghrib,
        tomorrowT.isha,
      ];

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

      setNextPrayerName(PRAYER_NAMES[targetPrayerIdx]);

      const targetHours = isTomorrow
        ? tomorrowHours[targetPrayerIdx]
        : todayHours[targetPrayerIdx];
      setNextPrayerTime(formatHours(targetHours));

      const targetTimeTotalSecs = Math.floor(targetHours * 3600);
      const currentTimeTotalSecs = Math.floor(currentDecimalHours * 3600);

      let deltaSecs = targetTimeTotalSecs - currentTimeTotalSecs;
      if (isTomorrow) {
        deltaSecs = 86400 - currentTimeTotalSecs + targetTimeTotalSecs;
      }
      if (deltaSecs < 0) deltaSecs = 0;

      const h = Math.floor(deltaSecs / 3600);
      const m = Math.floor((deltaSecs % 3600) / 60);
      const s = deltaSecs % 60;

      setCountdownString(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
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
      class="floating-shell zone"
      style={{ "-webkit-app-region": "drag" } as any}
    >
      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "2px",
          "text-align": "left",
        }}
      >
        <span
          data-tauri-drag-region
          class="text-subtle"
          style={{
            "font-size": "9px",
            "font-weight": "700",
            "letter-spacing": "0.06em",
            "text-transform": "uppercase",
          }}
        >
          {settings()?.language === "Indonesia" ? "Berikutnya" : "Next"}
        </span>
        <span
          data-tauri-drag-region
          class="text-fg"
          style={{
            "font-size": "12px",
            "font-weight": "800",
            "line-height": "1",
            "letter-spacing": "-0.02em",
          }}
        >
          {nextPrayerName()}
        </span>
        <span
          data-tauri-drag-region
          class="text-subtle"
          style={{ "font-size": "10px", "line-height": "1" }}
        >
          {nextPrayerTime()}
        </span>
      </div>

      <div data-tauri-drag-region>
        <span
          data-tauri-drag-region
          class="floating-accent tabular"
          style={{
            "font-size": "18px",
            "font-weight": "800",
            "letter-spacing": "-0.03em",
          }}
        >
          {countdownString()}
        </span>
      </div>

      <Show when={isHovered()}>
        <button
          type="button"
          onClick={handleClose}
          style={{ "-webkit-app-region": "no-drag" } as any}
          class="zone-close"
          aria-label="Close drop zone"
        >
          ✕
        </button>
      </Show>
    </div>
  );
}

export default DropZone;
