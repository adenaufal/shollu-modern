import { createContext, createEffect, createMemo, createSignal, onCleanup, onMount, untrack, useContext } from "solid-js";
import type { Accessor, ParentProps } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addLocalDays, countChanges, locationClock, toLocalDateIso } from "./helpers";
import type { AppSettings, DateResult, LayoutMode, PageId, PrayerTimes } from "./helpers";

export type NoticeTone = "info" | "success" | "error";
type Qibla = { degrees: number; cardinal: string };

interface AppState {
  settings: Accessor<AppSettings | null>;
  draftSettings: Accessor<AppSettings | null>;
  layoutMode: Accessor<LayoutMode>;
  lang: Accessor<string>;
  now: Accessor<Date>;
  today: Accessor<string>;
  todayTimes: Accessor<PrayerTimes | null>;
  tomorrowTimes: Accessor<PrayerTimes | null>;
  hijri: Accessor<DateResult | null>;
  qibla: Accessor<Qibla | null>;
  loading: Accessor<boolean>;
  error: Accessor<string>;
  dirtyCount: Accessor<number>;
  saving: Accessor<boolean>;
  refresh: () => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setLayoutMode: (mode: LayoutMode) => Promise<void>;
  updateDraft: (patch: Partial<AppSettings>) => void;
  saveDraft: () => Promise<void>;
  revertDraft: () => void;
  navigate: (page: PageId) => void;
  notify: (message: string, tone?: NoticeTone) => void;
}

const Context = createContext<AppState>();
const prayerCache = new Map<string, Promise<PrayerTimes>>();

export function calculationKey(settings: AppSettings): string {
  return JSON.stringify([settings.location.latitude, settings.location.longitude,
    settings.location.altitude, settings.location.timezone, settings.method,
    settings.madhab, settings.adjustments, settings.pembulatan]);
}

export function computeTimes(settings: AppSettings, dateIso: string): Promise<PrayerTimes> {
  const key = `${dateIso}:${calculationKey(settings)}`;
  const cached = prayerCache.get(key);
  if (cached) return cached;
  const request = invoke<PrayerTimes>("compute_prayer_times", {
    dateIso, ...settings.location, methodId: settings.method, madhabId: settings.madhab,
    fajrAngle: null, ishaAngle: null, adjustments: settings.adjustments,
    pembulatan: settings.pembulatan,
  }).catch((error: unknown) => { prayerCache.delete(key); throw error; });
  prayerCache.set(key, request);
  if (prayerCache.size > 256) prayerCache.delete(prayerCache.keys().next().value!);
  return request;
}

export function AppStateProvider(props: ParentProps<{
  navigate: (page: PageId) => void;
  notify: (message: string, tone?: NoticeTone) => void;
}>) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [draftSettings, setDraft] = createSignal<AppSettings | null>(null);
  const [instant, setInstant] = createSignal(new Date());
  const [todayTimes, setTodayTimes] = createSignal<PrayerTimes | null>(null);
  const [tomorrowTimes, setTomorrowTimes] = createSignal<PrayerTimes | null>(null);
  const [hijri, setHijri] = createSignal<DateResult | null>(null);
  const [qibla, setQibla] = createSignal<Qibla | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [refreshVersion, setRefreshVersion] = createSignal(0);
  const layoutMode = createMemo<LayoutMode>(() => settings()?.layout_mode === "ringkas" ? "ringkas" : "tenang");
  const lang = createMemo(() => settings()?.language ?? "Indonesia");
  const now = createMemo(() => locationClock(instant(), settings()?.location.timezone ?? -instant().getTimezoneOffset() / 60));
  const today = createMemo(() => toLocalDateIso(now()));
  const dirtyCount = createMemo(() => countChanges(settings(), draftSettings()));
  const fingerprint = createMemo(() => settings() ? calculationKey(settings()!) : "");
  const hijriOffset = createMemo(() => settings()?.hijri_adjustment ?? 0);
  let generation = 0;
  let disposed = false;
  let saveQueue: Promise<void> = Promise.resolve();
  const cleanups: (() => void)[] = [];

  // Preserve the user's unfinished location edits when another window changes appearance.
  const adoptSettings = (next: AppSettings) => {
    const previous = settings();
    const draft = draftSettings();
    const edits: Partial<AppSettings> = {};
    if (previous && draft) {
      for (const key of Object.keys(draft) as (keyof AppSettings)[]) {
        if (countChanges(previous[key], draft[key])) Object.assign(edits, { [key]: draft[key] });
      }
    }
    setSettings(next);
    setDraft({ ...next, ...edits });
  };

  const refresh = async () => {
    try {
      const next = await invoke<AppSettings>("get_settings");
      if (disposed) return;
      adoptSettings(next);
      setRefreshVersion((version) => version + 1);
    } catch (cause) {
      if (!disposed) { setError(String(cause)); setLoading(false); }
    }
  };

  createEffect(() => {
    const active = settings();
    if (!active) return;
    const [theme, accent] = active.skin.split("-");
    document.documentElement.dataset.theme = ["light", "dark", "sepia"].includes(theme) ? theme : "light";
    document.documentElement.dataset.accent = ["teal", "indigo", "emerald", "rose", "slate"].includes(accent) ? accent : "teal";
    document.documentElement.dataset.layout = layoutMode();
    document.documentElement.lang = lang() === "Indonesia" ? "id" : "en";
  });

  // A memo excludes mode/theme/language. Switching shells never recomputes astronomy.
  createEffect(() => {
    fingerprint();
    const iso = today();
    hijriOffset();
    refreshVersion();
    const active = untrack(settings);
    if (!active) return;
    const id = ++generation;
    setLoading(true);
    setError("");
    const date = new Date(`${iso}T12:00:00`);
    Promise.all([
      computeTimes(active, iso),
      computeTimes(active, toLocalDateIso(addLocalDays(date, 1))),
      invoke<DateResult>("convert_gregorian_to_hijri", {
        year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), adjustment: active.hijri_adjustment ?? 0,
      }),
      invoke<Qibla>("qibla_bearing", { latitude: active.location.latitude, longitude: active.location.longitude }),
    ]).then(([times, tomorrow, hijriDate, bearing]) => {
      if (disposed || id !== generation) return;
      setTodayTimes(times); setTomorrowTimes(tomorrow); setHijri(hijriDate); setQibla(bearing);
    }).catch((cause) => {
      if (!disposed && id === generation) { setError(String(cause)); setTodayTimes(null); setTomorrowTimes(null); }
    }).finally(() => { if (!disposed && id === generation) setLoading(false); });
  });

  const saveSettings = (patch: Partial<AppSettings>) => {
    const work = saveQueue.catch(() => {}).then(async () => {
      const current = settings();
      if (!current) throw new Error(lang() === "Indonesia" ? "Pengaturan belum dimuat." : "Settings have not loaded.");
      setSaving(true);
      try {
        const updated = { ...current, ...patch };
        await invoke("save_settings", { settings: updated });
        if (!disposed) adoptSettings(updated);
      } catch (cause) {
        props.notify(String(cause), "error");
        throw cause;
      } finally { if (!disposed) setSaving(false); }
    });
    saveQueue = work;
    return work;
  };

  const updateDraft = (patch: Partial<AppSettings>) => {
    setDraft((current) => current ? { ...current, ...patch } : null);
  };
  const revertDraft = () => setDraft(settings() ? structuredClone(settings()!) : null);
  const saveDraft = async () => {
    const current = settings();
    const draft = draftSettings();
    if (!current || !draft || !dirtyCount()) return;
    const patch: Partial<AppSettings> = {};
    for (const key of Object.keys(draft) as (keyof AppSettings)[]) {
      if (countChanges(current[key], draft[key])) Object.assign(patch, { [key]: draft[key] });
    }
    await saveSettings(patch);
    revertDraft();
    props.notify(lang() === "Indonesia" ? "Pengaturan disimpan." : "Settings saved.", "success");
  };

  onMount(() => {
    const ticker = setInterval(() => setInstant(new Date()), 1000);
    cleanups.push(() => clearInterval(ticker));
    listen<AppSettings>("settings-changed", (event) => adoptSettings(event.payload))
      .then((off) => disposed ? off() : cleanups.push(off)).catch(() => {});
    void refresh();
  });
  onCleanup(() => { disposed = true; generation++; cleanups.forEach((cleanup) => cleanup()); });

  return <Context.Provider value={{ settings, draftSettings, layoutMode, lang, now, today,
    todayTimes, tomorrowTimes, hijri, qibla, loading, error, dirtyCount, saving, refresh,
    saveSettings, setLayoutMode: (mode) => saveSettings({ layout_mode: mode }),
    updateDraft, saveDraft, revertDraft, navigate: props.navigate, notify: props.notify }}>
    {props.children}
  </Context.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(Context);
  if (!state) throw new Error("AppStateProvider is required");
  return state;
}
