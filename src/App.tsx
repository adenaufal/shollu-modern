import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

import { MainPage } from "./components/MainPage";
import { LocationPage } from "./components/LocationPage";
import { ConvertPage } from "./components/ConvertPage";
import { SchedulePage } from "./components/SchedulePage";
import { TasksPage } from "./components/TasksPage";
import { SettingsPage } from "./components/SettingsPage";
import { AboutPage } from "./components/AboutPage";
import { FloatingBar } from "./components/FloatingBar";
import { DropZone } from "./components/DropZone";

import {
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  CheckSquareIcon,
  ArrowRightLeftIcon,
  SettingsIcon,
  InfoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./components/Icons";

type Lang = "Indonesia" | "English";
type PageId =
  | "main"
  | "location"
  | "schedule"
  | "tasks"
  | "convert"
  | "settings"
  | "about";
// `nav.*` and `title.*` mirror the PageId set so every page has a translation
// key for both the sidebar label and the page header. Typing the dictionary
// as Record<Lang, Record<TranslationKey, string>> makes missing translations
// a compile-time error instead of a silent runtime fallback (issue #16).
type TranslationKey = `nav.${PageId}` | `title.${PageId}`;

const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = {
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
    "title.about": "Tentang Shollu",
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
    "title.about": "About Shollu",
  },
};

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

type ToastState = {
  id: number;
  title: string;
  message: string;
  tone: "info" | "success" | "warning";
};

export function App() {
  const [page, setPage] = createSignal<PageId>("main");
  const [theme, setThemeState] = createSignal<string>("light");
  const [accent, setAccentState] = createSignal<string>("teal");
  const [collapsed, setCollapsed] = createSignal<boolean>(false);
  const [lang, setLangState] = createSignal<Lang>("Indonesia");
  const [windowLabel, setWindowLabel] = createSignal<string>("main");
  const [toast, setToast] = createSignal<ToastState | null>(null);

  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const showToast = (
    title: string,
    message: string,
    tone: ToastState["tone"] = "info",
  ) => {
    if (toastTimer) clearTimeout(toastTimer);
    const next: ToastState = { id: Date.now(), title, message, tone };
    setToast(next);
    toastTimer = setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 4200);
  };

  const t = (key: TranslationKey, fallback: string): string => {
    const active = TRANSLATIONS[lang()] ?? TRANSLATIONS.English;
    return active[key] || fallback;
  };

  const setTheme = (next: string) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const setAccent = (next: string) => {
    setAccentState(next);
    document.documentElement.setAttribute("data-accent", next);
  };

  const setLang = (next: string) => {
    if (next === "Indonesia" || next === "English") {
      setLangState(next);
    }
  };

  const bootSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      if (res.language === "Indonesia" || res.language === "English") {
        setLangState(res.language);
      }

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

    const unlisten = await listen<ScheduledTask>("trigger-task", (event) => {
      const task = event.payload;
      showToast(
        `${task.task_type}: ${task.name}`,
        task.message ||
          (lang() === "Indonesia"
            ? "Pengingat jadwal tiba."
            : "Scheduled reminder due."),
        task.task_type === "Warning" ? "warning" : "info",
      );
    });

    onCleanup(() => {
      unlisten();
      if (toastTimer) clearTimeout(toastTimer);
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
        return <AboutPage lang={lang()} />;
      default:
        return <MainPage lang={lang()} />;
    }
  };

  const navItems: {
    id: PageId;
    labelKey: TranslationKey;
    fallback: string;
    Icon: typeof ClockIcon;
  }[] = [
    { id: "main", labelKey: "nav.main", fallback: "Main", Icon: ClockIcon },
    {
      id: "location",
      labelKey: "nav.location",
      fallback: "Location",
      Icon: MapPinIcon,
    },
    {
      id: "schedule",
      labelKey: "nav.schedule",
      fallback: "Schedule",
      Icon: CalendarIcon,
    },
    {
      id: "tasks",
      labelKey: "nav.tasks",
      fallback: "Tasks",
      Icon: CheckSquareIcon,
    },
    {
      id: "convert",
      labelKey: "nav.convert",
      fallback: "Convert",
      Icon: ArrowRightLeftIcon,
    },
    {
      id: "settings",
      labelKey: "nav.settings",
      fallback: "Settings",
      Icon: SettingsIcon,
    },
    { id: "about", labelKey: "nav.about", fallback: "About", Icon: InfoIcon },
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
      <div class="app-window">
        <aside
          class={`sidebar ${collapsed() ? "collapsed" : ""}`}
          aria-label="Primary"
        >
          <div class="sidebar-logo">
            <img src="/icon-32.png" alt="" width="26" height="26" />
            <Show when={!collapsed()}>
              <div class="sidebar-logo-text">
                <div class="sidebar-logo-name">Shollu</div>
                <div class="sidebar-logo-sub">Modern</div>
              </div>
            </Show>
          </div>

          <nav
            class="sidebar-nav"
            aria-label={
              lang() === "Indonesia" ? "Navigasi utama" : "Main navigation"
            }
          >
            <For each={navItems}>
              {(item) => {
                const active = () => page() === item.id;
                return (
                  <button
                    type="button"
                    onClick={() => setPage(item.id)}
                    class={`nav-item ${active() ? "active" : ""}`}
                    aria-current={active() ? "page" : undefined}
                    title={
                      collapsed() ? t(item.labelKey, item.fallback) : undefined
                    }
                  >
                    <span class="nav-icon" aria-hidden="true">
                      <item.Icon size={16} />
                    </span>
                    <Show when={!collapsed()}>
                      <span>{t(item.labelKey, item.fallback)}</span>
                    </Show>
                  </button>
                );
              }}
            </For>
          </nav>

          <div class="sidebar-footer">
            <Show
              when={!collapsed()}
              fallback={
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  class="nav-item nav-item-compact"
                  aria-label={
                    lang() === "Indonesia"
                      ? "Perluas sidebar"
                      : "Expand sidebar"
                  }
                  title={lang() === "Indonesia" ? "Perluas" : "Expand"}
                >
                  <ChevronRightIcon size={14} />
                </button>
              }
            >
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                class="nav-item nav-item-compact"
              >
                <ChevronLeftIcon size={14} />
                <span>
                  {lang() === "Indonesia" ? "Sembunyikan" : "Collapse"}
                </span>
              </button>
            </Show>
          </div>
        </aside>

        <div class="content-area">
          <header class="content-header">
            <h1 class="content-header-title">
              {t(`title.${page()}`, "Shollu Modern")}
            </h1>
          </header>

          <main class="content-scroll" id="main-content">
            {renderPage()}
          </main>
        </div>

        <Show when={toast()}>
          {(item) => (
            <div
              class={`app-toast tone-${item().tone}`}
              role="status"
              aria-live="polite"
            >
              <div class="app-toast-title">{item().title}</div>
              <div class="app-toast-message">{item().message}</div>
              <button
                type="button"
                class="app-toast-close"
                aria-label={
                  lang() === "Indonesia"
                    ? "Tutup notifikasi"
                    : "Dismiss notification"
                }
                onClick={() => setToast(null)}
              >
                ×
              </button>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
}

export default App;
