import { createSignal, onMount, onCleanup, Show } from "solid-js";
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
  const [lang, setLangState] = createSignal<string>("Indonesia");
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
      <div class="app-window select-none">
        {/* Sidebar Navigation */}
        <div class={`sidebar ${collapsed() ? "collapsed" : ""}`}>
          <div class="sidebar-logo">
            <img src="/icon-32.png" alt="Shollu Modern" />
            {!collapsed() && (
              <div class="sidebar-logo-text">
                <div class="sidebar-logo-name">
                  Shollu
                </div>
                <div class="sidebar-logo-sub">
                  Modern
                </div>
              </div>
            )}
          </div>

          <nav class="flex-1 py-4 space-y-1">
            <For each={navItems}>
              {(item) => (
                <button
                  onClick={() => setPage(item.id)}
                  class={`nav-item ${page() === item.id ? "active" : ""}`}
                  title={collapsed() ? t(item.labelKey, item.fallback) : undefined}
                >
                  <div class="nav-icon">
                    <item.Icon size={16} />
                  </div>
                  {!collapsed() && (
                    <span>
                      {t(item.labelKey, item.fallback)}
                    </span>
                  )}
                </button>
              )}
            </For>
          </nav>

          <div class="sidebar-footer py-2 px-1">
            {!collapsed() ? (
              <button
                onClick={() => setCollapsed(true)}
                class="nav-item text-xs px-3 py-2 flex items-center gap-2 w-full"
              >
                <ChevronLeftIcon size={14} />
                <span>{lang() === "Indonesia" ? "Sembunyikan" : "Collapse"}</span>
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(false)}
                class="nav-item justify-center py-2 w-full"
              >
                <ChevronRightIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div class="content-area">
          <div class="content-header">
            <div class="content-header-title">
              {t(`title.${page()}`, "Shollu Modern")}
            </div>
          </div>

          <div class="content-scroll flex-grow overflow-y-auto p-6">
            {renderPage()}
          </div>
        </div>
      </div>
    </Show>
  );
}
export default App;
