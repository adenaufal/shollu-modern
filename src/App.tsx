import { createSignal, onMount, onCleanup, createEffect, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

// Import page views
import { MainPage } from "./components/MainPage";
import { LocationPage } from "./components/LocationPage";
import { ConvertPage } from "./components/ConvertPage";
import { SchedulePage } from "./components/SchedulePage";
import { TasksPage } from "./components/TasksPage";
import { SettingsPage } from "./components/SettingsPage";
import { AboutPage } from "./components/AboutPage";
import { FloatingBar } from "./components/FloatingBar";
import { DropZone } from "./components/DropZone";

// Import brand icons
import {
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  CheckSquareIcon,
  ArrowRightLeftIcon,
  SettingsIcon,
  InfoIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "./components/Icons";

interface AppSettings {
  language: string;
  skin: string;
  autostart: boolean;
}

interface ScheduledTask {
  id: string;
  name: string;
  task_type: string;
  message: string;
  enabled: boolean;
}

export function App() {
  const [page, setPage] = createSignal<string>("main");
  const [theme, setThemeState] = createSignal<string>("light");
  const [accent, setAccentState] = createSignal<string>("teal");
  const [collapsed, setCollapsed] = createSignal<boolean>(false);
  const [tweaksOpen, setTweaksOpen] = createSignal<boolean>(false);
  const [lang, setLangState] = createSignal<string>("Indonesia");
  const [showTrayIcon, setShowTrayIcon] = createSignal<boolean>(true);
  const [windowLabel, setWindowLabel] = createSignal<string>("main");

  // Sync translation functions based on active language pack
  const t = (key: string, fallback: string): string => {
    // Basic reactive dictionary mapping fallbacks inside the client
    const dict: Record<string, Record<string, string>> = {
      Indonesia: {
        "nav.main": "Utama",
        "nav.location": "Lokasi",
        "nav.schedule": "Jadwal",
        "nav.tasks": "Pengingat",
        "nav.convert": "Konversi",
        "nav.settings": "Pengaturan",
        "nav.about": "Tentang",
        "title.main": "Layar Utama",
        "title.location": "Pengaturan Lokasi",
        "title.schedule": "Pembuat Jadwal",
        "title.tasks": "Jadwal Pengingat",
        "title.convert": "Konversi Kalender",
        "title.settings": "Pengaturan Aplikasi",
        "title.about": "Tentang Shollu"
      },
      English: {
        "nav.main": "Main",
        "nav.location": "Location",
        "nav.schedule": "Schedule",
        "nav.tasks": "Tasks",
        "nav.convert": "Convert",
        "nav.settings": "Settings",
        "nav.about": "About",
        "title.main": "Main Page",
        "title.location": "Location Parameters",
        "title.schedule": "Schedule Maker",
        "title.tasks": "Reminder Scheduler",
        "title.convert": "Convert Dates",
        "title.settings": "App Settings",
        "title.about": "About Shollu"
      }
    };
    const activeDict = dict[lang()] || dict["English"];
    return activeDict[key] || fallback;
  };

  const setTheme = (t: string) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  };

  const setAccent = (a: string) => {
    setAccentState(a);
    document.documentElement.setAttribute("data-accent", a);
  };

  const setLang = (l: string) => {
    setLangState(l);
  };

  // Load startup TOML settings on boot
  const bootSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      setLangState(res.language);

      // Parse theme and accent from Rust `skin` field (formatted as "{theme}-{accent}")
      if (res.skin && res.skin !== "default") {
        const parts = res.skin.split("-");
        if (parts.length === 2) {
          setTheme(parts[0]);
          setAccent(parts[1]);
        }
      } else {
        setTheme("light");
        setAccent("teal");
      }
    } catch (e) {
      console.error("Boot settings failed:", e);
      // Fallback defaults
      setTheme("light");
      setAccent("teal");
    }
  };

  onMount(async () => {
    try {
      const label = getCurrentWindow().label;
      setWindowLabel(label);
    } catch (e) {
      console.error("Failed to get current window label:", e);
    }

    await bootSettings();

    // Listen to async Tokio due alarms in scheduler.rs
    const unlisten = await listen<ScheduledTask>("trigger-task", (event) => {
      const task = event.payload;
      // Show warning/alert modal natively
      alert(`[Shollu - ${task.task_type}] ${task.name}\n\n${task.message}`);
    });

    onCleanup(() => {
      unlisten();
    });
  });

  const renderPage = () => {
    switch (page()) {
      case "main":
        return <MainPage lang={lang()} />;
      case "location":
        return <LocationPage lang={lang()} />;
      case "schedule":
        return <SchedulePage lang={lang()} />;
      case "tasks":
        return <TasksPage lang={lang()} />;
      case "convert":
        return <ConvertPage lang={lang()} />;
      case "settings":
        return (
          <SettingsPage
            lang={lang()}
            setLang={setLang}
            theme={theme()}
            setTheme={setTheme}
            accent={accent()}
            setAccent={setAccent}
          />
        );
      case "about":
        return <AboutPage lang={lang()} t={t} />;
      default:
        return <MainPage lang={lang()} />;
    }
  };

  const navItems = [
    { id: "main", labelKey: "nav.main", fallback: "Main", Icon: ClockIcon },
    { id: "location", labelKey: "nav.location", fallback: "Location", Icon: MapPinIcon },
    { id: "schedule", labelKey: "nav.schedule", fallback: "Schedule", Icon: CalendarIcon },
    { id: "tasks", labelKey: "nav.tasks", fallback: "Tasks", Icon: CheckSquareIcon },
    { id: "convert", labelKey: "nav.convert", fallback: "Convert", Icon: ArrowRightLeftIcon },
    { id: "settings", labelKey: "nav.settings", fallback: "Settings", Icon: SettingsIcon },
    { id: "about", labelKey: "nav.about", fallback: "About", Icon: InfoIcon }
  ];

  return (
    <Show
      when={windowLabel() === "main"}
      fallback={
        <Show when={windowLabel() === "floating-bar"} fallback={<DropZone />}>
          <FloatingBar />
        </Show>
      }
    >
      <div class="app-window select-none text-slate-800 dark:text-slate-200">
        {/* Sidebar Navigation */}
        <div class={`sidebar select-none ${collapsed() ? "collapsed" : ""}`}>
          <div class="sidebar-logo select-none border-b border-slate-200 dark:border-slate-800/40">
            <img src="src-tauri/icons/icon-32.png" alt="Shollu Modern" />
            {!collapsed() && (
              <div class="sidebar-logo-text select-none text-left">
                <div class="sidebar-logo-name font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  Shollu
                </div>
                <div class="sidebar-logo-sub text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Modern
                </div>
              </div>
            )}
          </div>

          <nav class="select-none flex-1 py-4 space-y-1">
            <For each={navItems}>
              {(item) => (
                <button
                  onClick={() => setPage(item.id)}
                  class={`nav-item select-none ${page() === item.id ? "active bg-teal-50 dark:bg-teal-950/20 font-bold text-teal-600 dark:text-teal-400" : ""}`}
                  title={collapsed() ? t(item.labelKey, item.fallback) : undefined}
                >
                  <div class="nav-icon text-slate-500 dark:text-slate-400">
                    <item.Icon size={16} />
                  </div>
                  {!collapsed() && (
                    <span class="text-sm font-semibold select-none">
                      {t(item.labelKey, item.fallback)}
                    </span>
                  )}
                </button>
              )}
            </For>
          </nav>

          <div class="sidebar-footer select-none border-t border-slate-200 dark:border-slate-800/40 py-2 px-1">
            <div class="tray-row select-none flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {!collapsed() && <span>{lang() === "Indonesia" ? "Tray Sistem" : "System Tray"}</span>}
              <div
                onClick={() => setShowTrayIcon(!showTrayIcon())}
                class={`toggle-pill cursor-pointer ${showTrayIcon() ? "active" : ""}`}
              >
                <div class="toggle-knob" />
              </div>
            </div>

            {!collapsed() ? (
              <button
                onClick={() => setCollapsed(true)}
                class="nav-item select-none text-xs text-slate-400 font-semibold px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 w-full"
              >
                <ChevronLeftIcon size={14} />
                <span>{lang() === "Indonesia" ? "Sembunyikan" : "Collapse"}</span>
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(false)}
                class="nav-item select-none justify-center py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 w-full"
              >
                <ChevronRightIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div class="content-area select-none flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
          <div class="content-header select-none flex items-center justify-between border-b border-slate-200 dark:border-slate-800/40 bg-white dark:bg-slate-900 px-6 py-2 select-none h-12 flex-shrink-0">
            <div class="content-header-title text-sm font-bold text-slate-800 dark:text-slate-200 select-none">
              {t(`title.${page()}`, "Shollu Modern")}
            </div>
            <button
              onClick={() => setTweaksOpen(!tweaksOpen())}
              class="btn btn-ghost select-none text-[11px] font-bold px-3 py-1 select-none border border-slate-200 dark:border-slate-800"
            >
              Tweaks
            </button>
          </div>

          <div class="content-scroll flex-grow overflow-y-auto p-6">
            {renderPage()}
          </div>
        </div>

        {/* Dynamic Slide Tweaks Panel */}
        <Show when={tweaksOpen()}>
          <div class="tweaks-panel select-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg absolute bottom-4 right-4 z-50">
            <div class="tweaks-header select-none flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/40 font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Appearance Tweaks</span>
              <button onClick={() => setTweaksOpen(false)} class="tweaks-close hover:text-slate-700 dark:hover:text-slate-300 font-bold">
                ✕
              </button>
            </div>
            <div class="tweaks-body select-none pt-3 space-y-4">
              <div class="space-y-1">
                <span class="tweak-label text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Select Theme
                </span>
                <div class="theme-btns flex gap-1 select-none">
                  <button onClick={() => setTheme("light")} class={`theme-btn text-[10px] flex-1 py-1 ${theme() === "light" ? "active" : ""}`}>
                    Light
                  </button>
                  <button onClick={() => setTheme("dark")} class={`theme-btn text-[10px] flex-1 py-1 ${theme() === "dark" ? "active" : ""}`}>
                    Dark
                  </button>
                  <button onClick={() => setTheme("sepia")} class={`theme-btn text-[10px] flex-1 py-1 ${theme() === "sepia" ? "active" : ""}`}>
                    Sepia
                  </button>
                </div>
              </div>

              <div class="space-y-1 select-none">
                <span class="tweak-label text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Select Accent
                </span>
                <div class="flex gap-2 justify-center select-none pt-1">
                  {(
                    [
                      { id: "teal", color: "oklch(0.72 0.17 208)" },
                      { id: "indigo", color: "oklch(0.67 0.18 270)" },
                      { id: "emerald", color: "oklch(0.72 0.17 155)" },
                      { id: "rose", color: "oklch(0.70 0.18 10)" },
                      { id: "slate", color: "oklch(0.567 0.028 210)" }
                    ] as const
                  ).map((a) => (
                    <button
                      onClick={() => setAccent(a.id)}
                      style={{
                        width: "18px",
                        height: "18px",
                        "border-radius": "50%",
                        background: a.color,
                        border: accent() === a.id ? "2.5px solid var(--fg)" : "2px solid transparent",
                        cursor: "pointer"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}
export default App;
