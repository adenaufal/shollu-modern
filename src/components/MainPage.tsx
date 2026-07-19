import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { QiblaCompass } from "./QiblaCompass";
import {
  formatHours,
  H_MONTHS_ID,
  H_MONTHS_EN,
  G_DAYS_ID,
  G_DAYS_EN,
  G_MONTHS_ID,
  G_MONTHS_EN,
  PRAYER_NAMES,
  toLocalDateIso,
  addLocalDays,
} from "../helpers";
import type { AppSettings, PrayerTimes, HijriDate } from "../helpers";

interface MainPageProps {
  lang: string;
}

const TIME_KEYS = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

export function MainPage(props: MainPageProps) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [yesterdayTimes, setYesterdayTimes] = createSignal<PrayerTimes | null>(
    null,
  );
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [tomorrowTimes, setTomorrowTimes] = createSignal<PrayerTimes | null>(
    null,
  );
  const [qiblaAngle, setQiblaAngle] = createSignal<number>(293.81);
  const [qiblaCardinal, setQiblaCardinal] = createSignal<string>("W-NW");
  const [hijriToday, setHijriToday] = createSignal<HijriDate | null>(null);
  const [nextPrayerName, setNextPrayerName] = createSignal<string>("—");
  const [nextPrayerClock, setNextPrayerClock] = createSignal<string>("--:--");
  const [countdownString, setCountdownString] =
    createSignal<string>("--:--:--");
  const [currentPrayerName, setCurrentPrayerName] = createSignal<string>("—");
  const [loading, setLoading] = createSignal<boolean>(true);
  const [error, setError] = createSignal<string | null>(null);

  let tickerInterval: ReturnType<typeof setInterval> | undefined;

  const prayerLabel = (name: string) => {
    if (name === "Sunrise" && props.lang === "Indonesia") return "Syuruq";
    return name;
  };

  const initMainPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const activeSettings = await invoke<AppSettings>("get_settings");
      setSettings(activeSettings);

      const today = new Date();
      const hijri = await invoke<HijriDate>("convert_gregorian_to_hijri", {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        adjustment: 0,
      });
      setHijriToday(hijri);

      const qibla = await invoke<{ degrees: number; cardinal: string }>(
        "qibla_bearing",
        {
          latitude: activeSettings.location.latitude,
          longitude: activeSettings.location.longitude,
        },
      );
      setQiblaAngle(qibla.degrees);
      setQiblaCardinal(qibla.cardinal);

      const yesterdayIso = toLocalDateIso(addLocalDays(today, -1));
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

      const [yesterday, currToday, tomorrow] = await Promise.all([
        fetchTimes(yesterdayIso),
        fetchTimes(todayIso),
        fetchTimes(tomorrowIso),
      ]);

      setYesterdayTimes(yesterday);
      setTodayTimes(currToday);
      setTomorrowTimes(tomorrow);
      startCountdownTicker(currToday, tomorrow);
    } catch (e) {
      console.error("Main page data initialization failed:", e);
      setError(
        props.lang === "Indonesia"
          ? "Gagal memuat waktu sholat. Periksa lokasi/pengaturan lalu coba lagi."
          : "Failed to load prayer times. Check location/settings and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const startCountdownTicker = (
    todayT: PrayerTimes,
    tomorrowT: PrayerTimes,
  ) => {
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
      setNextPrayerClock(
        Number.isFinite(targetHours) ? formatHours(targetHours) : "--:--",
      );

      let currentIdx = -1;
      for (let i = todayHours.length - 1; i >= 0; i--) {
        if (currentDecimalHours >= todayHours[i]) {
          currentIdx = i;
          break;
        }
      }
      setCurrentPrayerName(
        currentIdx === -1 ? "Isha" : PRAYER_NAMES[currentIdx],
      );

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
        `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
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

  const getFormattedGregDate = () => {
    const d = new Date();
    const wday =
      props.lang === "Indonesia"
        ? G_DAYS_ID[d.getDay()]
        : G_DAYS_EN[d.getDay()];
    const mon =
      props.lang === "Indonesia"
        ? G_MONTHS_ID[d.getMonth()]
        : G_MONTHS_EN[d.getMonth()];
    return `${wday}, ${d.getDate()} ${mon} ${d.getFullYear()}`;
  };

  const getFormattedHijriDate = () => {
    const h = hijriToday();
    if (!h) return "—";
    const monName =
      props.lang === "Indonesia"
        ? H_MONTHS_ID[h.month - 1]
        : H_MONTHS_EN[h.month - 1];
    return `${h.day} ${monName} ${h.year} H`;
  };

  const isNext = (name: string) => nextPrayerName() === name;
  const isDone = (name: string) => {
    if (currentPrayerName() === name) return false;
    const currIdx = PRAYER_NAMES.indexOf(currentPrayerName());
    const nameIdx = PRAYER_NAMES.indexOf(name);
    if (currIdx < 0 || nameIdx < 0) return false;
    if (currentPrayerName() === "Isha" && nextPrayerName() === "Fajr")
      return false;
    return currIdx > nameIdx;
  };

  return (
    <div class="page-stack animate-fade-in">
      <div class="location-strip">
        <div>
          <div class="location-name">
            {settings()?.location.name ??
              (props.lang === "Indonesia"
                ? "Lokasi tidak tersedia"
                : "Location unavailable")}
          </div>
          <div class="location-coords">
            {settings()
              ? `${settings()!.location.latitude.toFixed(4)}°, ${settings()!.location.longitude.toFixed(4)}° · ${settings()!.location.altitude} m · UTC+${settings()!.location.timezone.toFixed(0)}`
              : props.lang === "Indonesia"
                ? "Memuat…"
                : "Loading…"}
          </div>
        </div>
        <div class="date-display">
          <div class="date-greg">{getFormattedGregDate()}</div>
          <div class="date-hijri">{getFormattedHijriDate()}</div>
        </div>
      </div>

      <Show when={error()}>
        <div class="status-banner tone-error" role="alert">
          <div
            class="text-fg"
            style={{ "font-weight": "600", "margin-bottom": "6px" }}
          >
            {props.lang === "Indonesia"
              ? "Tidak bisa memuat data"
              : "Could not load data"}
          </div>
          <p class="text-muted" style={{ margin: "0 0 12px" }}>
            {error()}
          </p>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={initMainPageData}
          >
            {props.lang === "Indonesia" ? "Coba lagi" : "Retry"}
          </button>
        </div>
      </Show>

      <Show when={loading()}>
        <div
          class="page-stack skeleton-pulse"
          aria-busy="true"
          aria-live="polite"
        >
          <div class="surface-card">
            <div
              class="skeleton-block"
              style={{
                height: "12px",
                width: "120px",
                "margin-bottom": "14px",
              }}
            />
            <div
              class="skeleton-block"
              style={{
                height: "28px",
                width: "220px",
                "margin-bottom": "10px",
              }}
            />
            <div
              class="skeleton-block"
              style={{ height: "10px", width: "160px" }}
            />
          </div>
          <div class="prayer-grid">
            <div
              class="skeleton-block"
              style={{ height: "32px", "border-radius": "0" }}
            />
            <For each={[0, 1, 2, 3, 4, 5]}>
              {() => (
                <div
                  class="skeleton-block"
                  style={{
                    height: "40px",
                    "border-radius": "0",
                    "border-top": "1px solid var(--border)",
                  }}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <div class="hero-section">
          <div>
            <div class="hero-eyebrow">
              {props.lang === "Indonesia"
                ? "Waktu Sholat Berikutnya"
                : "Next Prayer"}
              <span class="hero-gold-dot" aria-hidden="true" />
            </div>
            <div class="hero-main">
              <span class="hero-prayer">{prayerLabel(nextPrayerName())}</span>
              <span class="hero-countdown tabular" aria-live="polite">
                {countdownString()}
              </span>
            </div>
            <div class="hero-time">
              {props.lang === "Indonesia"
                ? `pukul ${nextPrayerClock()} · saat ini: ${prayerLabel(currentPrayerName())}`
                : `at ${nextPrayerClock()} · now: ${prayerLabel(currentPrayerName())}`}
            </div>
          </div>

          <div
            class="qibla-mini"
            title={
              props.lang === "Indonesia" ? "Arah kiblat" : "Qibla direction"
            }
          >
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

      <Show when={!loading() && todayTimes()}>
        <div
          class="prayer-grid"
          role="table"
          aria-label={
            props.lang === "Indonesia"
              ? "Jadwal sholat 3 hari"
              : "3-day prayer schedule"
          }
        >
          <div class="prayer-grid-header" role="row">
            <div class="gh-cell" role="columnheader">
              {props.lang === "Indonesia" ? "Sholat" : "Prayer"}
            </div>
            <div class="gh-cell" role="columnheader">
              {props.lang === "Indonesia" ? "Kemarin" : "Yesterday"}
            </div>
            <div class="gh-cell today" role="columnheader">
              {props.lang === "Indonesia" ? "Hari Ini" : "Today"}
            </div>
            <div class="gh-cell" role="columnheader">
              {props.lang === "Indonesia" ? "Besok" : "Tomorrow"}
            </div>
          </div>

          <For each={[...PRAYER_NAMES]}>
            {(name) => {
              const idx = PRAYER_NAMES.indexOf(name);
              const key = TIME_KEYS[idx];
              const yest = () => yesterdayTimes()?.[key];
              const tod = () => todayTimes()?.[key];
              const tmrw = () => tomorrowTimes()?.[key];

              return (
                <div
                  class={`prayer-row ${isNext(name) ? "is-next" : ""}`}
                  role="row"
                >
                  <div class="gr-cell name" role="cell">
                    {prayerLabel(name)}
                  </div>
                  <div class="gr-cell text-subtle" role="cell">
                    {yest() != null ? formatHours(yest()!) : "--:--"}
                  </div>
                  <div class="gr-cell" role="cell">
                    <Show when={isNext(name)}>
                      <span class="next-dot" aria-hidden="true" />
                    </Show>
                    <span class={isNext(name) ? "next-time" : ""}>
                      {tod() != null ? formatHours(tod()!) : "--:--"}
                    </span>
                    <Show when={isDone(name)}>
                      <span
                        class="done-check"
                        aria-label={
                          props.lang === "Indonesia" ? "Sudah lewat" : "Passed"
                        }
                      >
                        ✓
                      </span>
                    </Show>
                  </div>
                  <div class="gr-cell text-subtle" role="cell">
                    {tmrw() != null ? formatHours(tmrw()!) : "--:--"}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
