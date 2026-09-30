import { createEffect, createMemo, createSignal, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppStateProvider, useAppState } from "./state";
import type { NoticeTone } from "./state";
import { getMethodName, H_MONTHS_ID, H_MONTHS_EN } from "./helpers";
import type { PageId, ScheduledTask } from "./helpers";
import { MainPage } from "./components/MainPage";
import { LocationPage } from "./components/LocationPage";
import { SchedulePage } from "./components/SchedulePage";
import { TasksPage } from "./components/TasksPage";
import { ConvertPage } from "./components/ConvertPage";
import { SettingsPage } from "./components/SettingsPage";
import { AboutPage } from "./components/AboutPage";
import { FloatingBar } from "./components/FloatingBar";
import { DropZone } from "./components/DropZone";
import { ClockIcon, MapPinIcon, CalendarIcon, CheckSquareIcon, ArrowRightLeftIcon, SettingsIcon, InfoIcon, SearchIcon } from "./components/Icons";
import "./App.css";
import "./shell.css";

const pages = [
  { id: "main", label: ["Utama", "Main"], Icon: ClockIcon },
  { id: "schedule", label: ["Jadwal", "Schedule"], Icon: CalendarIcon },
  { id: "tasks", label: ["Pengingat", "Reminders"], Icon: CheckSquareIcon },
  { id: "convert", label: ["Konversi", "Convert"], Icon: ArrowRightLeftIcon },
  { id: "location", label: ["Lokasi", "Location"], Icon: MapPinIcon },
  { id: "settings", label: ["Pengaturan", "Settings"], Icon: SettingsIcon },
  { id: "about", label: ["Tentang", "About"], Icon: InfoIcon },
] as const;
interface City { id: number; name: string; region_name: string; latitude: number; longitude: number }
type Command = { id: string; label: string; detail: string; run: () => void | Promise<void> };

function Shell(props: { page: PageId; navigate: (page: PageId) => void }) {
  const app = useAppState();
  const id = () => app.lang() === "Indonesia";
  const label = (page: PageId) => pages.find((item) => item.id === page)!.label[id() ? 0 : 1];
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [cities, setCities] = createSignal<City[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [cityError, setCityError] = createSignal("");
  const [activeCommand, setActiveCommand] = createSignal(0);
  createEffect(() => {
    props.page;
    queueMicrotask(() => document.getElementById("main-content")?.scrollTo(0, 0));
  });
  let input: HTMLInputElement | undefined;
  let palette: HTMLDivElement | undefined;
  let previousFocus: HTMLElement | null = null;
  let searchGeneration = 0;
  const modifier = /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";
  const safe = (work: () => Promise<void>) => { void work().catch(() => {}); };
  const toggleMode = () => app.setLayoutMode(app.layoutMode() === "tenang" ? "ringkas" : "tenang");
  const openPalette = () => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery(""); setActiveCommand(0); setPaletteOpen(true);
    queueMicrotask(() => input?.focus());
  };
  const closePalette = () => {
    setPaletteOpen(false);
    queueMicrotask(() => previousFocus?.focus());
  };
  const exportSchedule = () => {
    if (props.page === "schedule" || (props.page === "main" && app.layoutMode() === "ringkas")) window.dispatchEvent(new CustomEvent("shollu-export"));
    else {
      props.navigate("schedule");
      queueMicrotask(() => window.dispatchEvent(new CustomEvent("shollu-export")));
    }
  };
  const commands = createMemo<Command[]>(() => {
    const all: Command[] = pages.map((page) => ({ id: page.id,
      label: page.label[id() ? 0 : 1], detail: id() ? "Buka halaman" : "Open page",
      run: () => props.navigate(page.id) }));
    all.push(
      { id: "mode", label: id() ? "Ganti mode tampilan" : "Switch display mode", detail: `${modifier}+Shift+M`, run: toggleMode },
      { id: "export", label: id() ? "Ekspor jadwal CSV" : "Export schedule CSV", detail: `${modifier}+E`, run: exportSchedule },
      { id: "floating", label: id() ? "Tampilkan/sembunyikan bilah melayang" : "Toggle floating bar", detail: "Widget", run: () => app.saveSettings({ floating_bar_visible: !app.settings()?.floating_bar_visible }) },
      { id: "dropzone", label: id() ? "Tampilkan/sembunyikan drop zone" : "Toggle drop zone", detail: "Widget", run: () => app.saveSettings({ drop_zone_visible: !app.settings()?.drop_zone_visible }) },
    );
    const term = query().trim().toLocaleLowerCase();
    const filtered = term ? all.filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase().includes(term)) : all;
    for (const city of cities()) filtered.push({ id: `city-${city.id}`, label: city.name, detail: city.region_name,
      run: async () => {
        const current = app.settings(); if (!current) return;
        await app.saveSettings({ location: { ...current.location, name: city.name, latitude: city.latitude, longitude: city.longitude } });
        props.navigate("location");
        app.notify(id() ? "Kota diperbarui. Periksa zona waktu dan ketinggian." : "City updated. Check the timezone and altitude.", "success");
      } });
    return filtered;
  });
  createEffect(() => {
    const term = query().trim(); const open = paletteOpen(); const generation = ++searchGeneration;
    setCities([]); setCityError(""); setSearching(false); setActiveCommand(0);
    if (!open || term.length < 2) return;
    setSearching(true);
    const timer = setTimeout(() => {
      invoke<City[]>("search_cities", { query: term, limit: 6 }).then((results) => {
        if (generation === searchGeneration) setCities(results);
      }).catch((cause) => { if (generation === searchGeneration) setCityError(String(cause)); })
        .finally(() => { if (generation === searchGeneration) setSearching(false); });
    }, 220);
    onCleanup(() => clearTimeout(timer));
  });
  const runCommand = (command: Command | undefined) => {
    if (!command) return;
    closePalette();
    Promise.resolve().then(command.run).catch((cause) => app.notify(String(cause), "error"));
  };
  onMount(() => {
    const keydown = (event: KeyboardEvent) => {
      if (paletteOpen()) {
        if (event.key === "Escape") { event.preventDefault(); closePalette(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); const count = commands().length;
          if (count) setActiveCommand((index) => (index + (event.key === "ArrowDown" ? 1 : count - 1)) % count);
        }
        if (event.key === "Enter") { event.preventDefault(); runCommand(commands()[activeCommand()]); }
        if (event.key === "Tab" && palette) {
          const focusable = [...palette.querySelectorAll<HTMLElement>('input, button:not([disabled])')];
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") { event.preventDefault(); openPalette(); }
      else if (key === "m" && event.shiftKey) { event.preventDefault(); safe(toggleMode); }
      else if (key === "s") { event.preventDefault(); window.dispatchEvent(new CustomEvent("shollu-save")); }
      else if (key === "e") { event.preventDefault(); exportSchedule(); }
      else if (key === "w" && isTauri()) { event.preventDefault(); safe(() => getCurrentWindow().hide()); }
    };
    window.addEventListener("keydown", keydown);
    onCleanup(() => window.removeEventListener("keydown", keydown));
  });
  const dateLabel = () => app.now().toLocaleDateString(id() ? "id-ID" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  const hijriLabel = () => { const date = app.hijri(); return date ? `${date.day} ${(id() ? H_MONTHS_ID : H_MONTHS_EN)[date.month - 1]} ${date.year} H` : ""; };
  const coordinate = () => { const loc = app.settings()?.location; return loc ? `${Math.abs(loc.latitude).toFixed(4)}°${loc.latitude < 0 ? "S" : "N"}, ${Math.abs(loc.longitude).toFixed(4)}°${loc.longitude < 0 ? "W" : "E"}` : ""; };

  return <div class={`shollu-shell ${app.layoutMode()}`}>
    <Show when={app.layoutMode() === "tenang"}>
      <aside class="calm-rail" aria-label={id() ? "Navigasi utama" : "Main navigation"}>
        <button class="rail-logo" onClick={() => props.navigate("main")} aria-label="Shollu Modern"><img src="/icon-32.png" width="30" height="30" alt=""/></button>
        <nav class="rail-nav"><For each={pages.filter((item) => item.id !== "settings" && item.id !== "about")}>{(item) => <button class="rail-item" classList={{ active: props.page === item.id }} title={label(item.id)} aria-label={label(item.id)} aria-current={props.page === item.id ? "page" : undefined} onClick={() => props.navigate(item.id)}><item.Icon size={18}/></button>}</For></nav>
        <div class="rail-bottom"><For each={pages.filter((item) => item.id === "settings" || item.id === "about")}>{(item) => <button class="rail-item" classList={{ active: props.page === item.id }} title={label(item.id)} aria-label={label(item.id)} aria-current={props.page === item.id ? "page" : undefined} onClick={() => props.navigate(item.id)}><item.Icon size={18}/></button>}</For><button class="rail-item" onClick={openPalette} title={`${id() ? "Cari perintah" : "Search commands"} (${modifier}+K)`} aria-label={id() ? "Cari perintah" : "Search commands"}><SearchIcon size={17}/></button></div>
      </aside>
    </Show>
    <div class="shell-content">
      <header class="shell-topbar"><Show when={app.layoutMode() === "tenang"} fallback={<>
        <div class="compact-identity"><img src="/icon-32.png" width="20" height="20" alt=""/><span>{app.settings()?.location.name ?? "Shollu Modern"}<i>/</i>{label(props.page)}</span></div>
        <button class="palette-trigger" onClick={openPalette}><SearchIcon size={13}/><span>{id() ? "Cari perintah" : "Search commands"}</span><kbd>{modifier} K</kbd></button>
      </>}>
        <div class="calm-top-identity"><strong>{props.page === "main" ? app.settings()?.location.name ?? "Shollu Modern" : label(props.page)}</strong><Show when={props.page === "main"}><span class="shell-coordinates">{coordinate()}</span><span class="method-pill">{getMethodName(app.settings()?.method ?? 2)}</span></Show></div>
        <div class="shell-dates"><span>{dateLabel()}</span><small>{hijriLabel()}</small></div>
      </Show><div id="page-actions" class="shell-page-actions"/></header>
      <Show when={app.layoutMode() === "ringkas"}><nav class="compact-tabs" aria-label={id() ? "Navigasi utama" : "Main navigation"}><For each={pages}>{(item) => <button classList={{ active: props.page === item.id }} aria-current={props.page === item.id ? "page" : undefined} onClick={() => props.navigate(item.id)}>{label(item.id)}</button>}</For></nav></Show>
      <main class="shell-main" id="main-content">
        <Show when={app.error() && props.page !== "main"}><div class="shell-error status-banner tone-error" role="alert">{app.error()}<button class="btn btn-secondary" onClick={() => void app.refresh()}>{id() ? "Coba lagi" : "Retry"}</button></div></Show>
        <Switch>
          <Match when={props.page === "main"}><MainPage lang={app.lang()}/></Match>
          <Match when={props.page === "schedule"}><SchedulePage lang={app.lang()}/></Match>
          <Match when={props.page === "location"}><LocationPage lang={app.lang()}/></Match>
          <Match when={props.page === "tasks"}><TasksPage lang={app.lang()}/></Match>
          <Match when={props.page === "convert"}><ConvertPage lang={app.lang()}/></Match>
          <Match when={props.page === "settings"}><SettingsPage lang={app.lang()}/></Match>
          <Match when={props.page === "about"}><AboutPage lang={app.lang()}/></Match>
        </Switch>
      </main>
      <Show when={app.layoutMode() === "ringkas"}><footer class="compact-status" role="status"><span>{app.settings()?.location.name ?? "—"} · {getMethodName(app.settings()?.method ?? 2)} · UTC{(app.settings()?.location.timezone ?? 0) >= 0 ? "+" : ""}{app.settings()?.location.timezone ?? "—"}</span><span>{app.saving() ? (id() ? "Menyimpan…" : "Saving…") : app.dirtyCount() ? `${app.dirtyCount()} ${id() ? "perubahan belum disimpan" : "unsaved changes"}` : id() ? "Tersimpan" : "Saved"}<i>v1.0.0</i></span></footer></Show>
    </div>
    <Show when={paletteOpen()}><div class="palette-scrim" onClick={(event) => { if (event.target === event.currentTarget) closePalette(); }}>
      <div ref={palette} class="command-palette" role="dialog" aria-modal="true" aria-label={id() ? "Cari perintah dan kota" : "Search commands and cities"}>
        <div class="palette-search"><SearchIcon size={18}/><input ref={input} value={query()} onInput={(event) => setQuery(event.currentTarget.value)} aria-label={id() ? "Cari perintah atau kota" : "Search commands or cities"} placeholder={id() ? "Cari halaman, perintah, atau kota…" : "Search pages, commands, or cities…"}/><button class="palette-dismiss" onClick={closePalette} aria-label={id() ? "Tutup pencarian" : "Close search"}><kbd>Esc</kbd></button></div>
        <div class="palette-results"><For each={commands()}>{(command, index) => <button classList={{ selected: activeCommand() === index() }} onMouseEnter={() => setActiveCommand(index())} onClick={() => runCommand(command)}><span>{command.label}</span><small>{command.detail}</small></button>}</For><Show when={searching()}><p>{id() ? "Mencari kota…" : "Searching cities…"}</p></Show><Show when={cityError()}><p role="alert">{id() ? "Pencarian kota gagal. Coba lagi." : "City search failed. Try again."}</p></Show><Show when={!commands().length && !searching()}><p>{id() ? "Tidak ada hasil." : "No results."}</p></Show></div>
        <div class="palette-foot">↑ ↓ {id() ? "pilih" : "select"}<span>↵ {id() ? "buka" : "open"}</span></div>
      </div>
    </div></Show>
  </div>;
}

export function App() {
  const [page, setPage] = createSignal<PageId>("main");
  const [notice, setNotice] = createSignal<{ message: string; tone: NoticeTone } | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const notify = (message: string, tone: NoticeTone = "info") => {
    if (timer) clearTimeout(timer);
    setNotice({ message, tone }); timer = setTimeout(() => setNotice(null), 5000);
  };
  const windowLabel = isTauri() ? getCurrentWindow().label : new URLSearchParams(location.search).get("window") ?? "main";
  const overlay = windowLabel === "floating-bar" || windowLabel === "drop-zone";
  document.documentElement.dataset.window = overlay ? windowLabel : "main";
  onMount(() => {
    let disposed = false; const off: (() => void)[] = [];
    if (!overlay && isTauri()) {
      listen<ScheduledTask>("trigger-task", (event) => notify(`${event.payload.name}: ${event.payload.message}`, event.payload.task_type === "Warning" ? "error" : "info")).then((unlisten) => disposed ? unlisten() : off.push(unlisten));
      listen<{ taskId: string; message: string }>("task-error", (event) => notify(event.payload.message, "error")).then((unlisten) => disposed ? unlisten() : off.push(unlisten));
    }
    onCleanup(() => { disposed = true; off.forEach((unlisten) => unlisten()); if (timer) clearTimeout(timer); });
  });
  return <AppStateProvider navigate={setPage} notify={notify}>
    <Switch><Match when={windowLabel === "floating-bar"}><FloatingBar/></Match><Match when={windowLabel === "drop-zone"}><DropZone/></Match><Match when={!overlay}><Shell page={page()} navigate={setPage}/></Match></Switch>
    <Show when={!overlay ? notice() : null}>{(item) => <div class={`shell-toast tone-${item().tone}`} role={item().tone === "error" ? "alert" : "status"}><span>{item().message}</span><button onClick={() => setNotice(null)} aria-label="Dismiss">×</button></div>}</Show>
  </AppStateProvider>;
}
export default App;
