import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import {
  formatHours,
  PRAYER_NAMES,
  toLocalDateIso,
  addLocalDays,
} from "../helpers";
import type { AppSettings, PrayerTimes } from "../helpers";

export function FloatingBar() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [nextPrayerName, setNextPrayerName] = createSignal<string>("—");
  const [countdownString, setCountdownString] =
    createSignal<string>("--:--:--");

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

      setTodayTimes(currToday);
      startTicker(currToday, tomorrow);
    } catch (e) {
      console.error("FloatingBar data initialization failed:", e);
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

  const activeClass = (name: string) =>
    nextPrayerName() === name ? "floating-accent" : "text-subtle";

  return (
    <div
      data-tauri-drag-region
      class="floating-shell bar"
      style={{ "-webkit-app-region": "drag" } as any}
    >
      <div
        data-tauri-drag-region
        style={{ display: "flex", "align-items": "center", gap: "8px" }}
      >
        <img
          data-tauri-drag-region
          src="/icon-32.png"
          alt=""
          width="20"
          height="20"
          style={{ "border-radius": "4px" }}
        />
        <span
          data-tauri-drag-region
          style={{ "font-size": "12px", "font-weight": "700" }}
        >
          Shollu ·{" "}
          <span class="floating-accent">
            {settings()?.location.name ?? "—"}
          </span>
        </span>
      </div>

      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          "font-size": "12px",
          "font-weight": "600",
        }}
      >
        <span data-tauri-drag-region>
          {settings()?.language === "Indonesia" ? "Berikutnya" : "Next"}:{" "}
          <span class="floating-accent">{nextPrayerName()}</span>
        </span>
        <span
          data-tauri-drag-region
          class="floating-accent tabular"
          style={{ "font-size": "13px" }}
        >
          {countdownString()}
        </span>
      </div>

      <div
        data-tauri-drag-region
        style={{
          display: "flex",
          "align-items": "center",
          gap: "12px",
          "font-size": "10px",
          "font-weight": "700",
        }}
      >
        <Show when={todayTimes()}>
          {(times) => (
            <>
              <span data-tauri-drag-region class={activeClass("Fajr")}>
                Fajr {formatHours(times().fajr)}
              </span>
              <span data-tauri-drag-region class={activeClass("Dhuhr")}>
                Dhuhr {formatHours(times().dhuhr)}
              </span>
              <span data-tauri-drag-region class={activeClass("Asr")}>
                Asr {formatHours(times().asr)}
              </span>
              <span data-tauri-drag-region class={activeClass("Maghrib")}>
                Maghrib {formatHours(times().maghrib)}
              </span>
              <span data-tauri-drag-region class={activeClass("Isha")}>
                Isha {formatHours(times().isha)}
              </span>
            </>
          )}
        </Show>

        <button
          type="button"
          onClick={handleClose}
          style={{ "-webkit-app-region": "no-drag" } as any}
          class="floating-close"
          aria-label="Close floating bar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default FloatingBar;
