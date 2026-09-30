import { createSignal, onMount, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { ACCENTS } from "../helpers";
import type { AppSettings } from "../helpers";

interface SettingsPageProps {
  lang: string;
  setLang: (l: string) => void;
  theme: string;
  setTheme: (t: string) => void;
  accent: string;
  setAccent: (a: string) => void;
}

const themeLabel = (lang: string, theme: string) => {
  if (lang === "Indonesia") {
    if (theme === "light") return "Terang";
    if (theme === "dark") return "Gelap";
    if (theme === "sepia") return "Sepia";
  }
  return theme.charAt(0).toUpperCase() + theme.slice(1);
};

export function SettingsPage(props: SettingsPageProps) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [soundEnabled, setSoundEnabled] = createSignal<boolean>(true);
  const [adzanPath, setAdzanPath] = createSignal<string>("");
  const [alwaysOnTop, setAlwaysOnTop] = createSignal<boolean>(false);
  const [autostart, setAutostart] = createSignal<boolean>(false);
  const [pembulatan, setPembulatan] = createSignal<number>(0);
  const [floatingBar, setFloatingBar] = createSignal<boolean>(false);
  const [dropZone, setDropZone] = createSignal<boolean>(false);
  const [status, setStatus] = createSignal<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const handleToggleFloatingBar = async () => {
    const nextVal = !floatingBar();
    try {
      await invoke("toggle_floating_bar", { show: nextVal });
      setFloatingBar(nextVal);
      const curr = settings();
      if (curr) {
        await invoke("save_settings", {
          settings: { ...curr, floating_bar_visible: nextVal },
        });
      }
    } catch (e) {
      console.error("Failed to toggle floating bar:", e);
      setStatus({
        tone: "error",
        text:
          props.lang === "Indonesia"
            ? "Gagal mengubah bilah melayang."
            : "Failed to toggle floating bar.",
      });
    }
  };

  const handleToggleDropZone = async () => {
    const nextVal = !dropZone();
    try {
      await invoke("toggle_drop_zone", { show: nextVal });
      setDropZone(nextVal);
      const curr = settings();
      if (curr) {
        await invoke("save_settings", {
          settings: { ...curr, drop_zone_visible: nextVal },
        });
      }
    } catch (e) {
      console.error("Failed to toggle drop zone:", e);
      setStatus({
        tone: "error",
        text:
          props.lang === "Indonesia"
            ? "Gagal mengubah drop zone."
            : "Failed to toggle drop zone.",
      });
    }
  };

  const loadSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      setSettings(res);
      setSoundEnabled(res.adzan_sound_enabled);
      setAdzanPath(res.adzan_file_path);
      setAlwaysOnTop(res.always_on_top);
      setAutostart(res.autostart);
      setPembulatan(res.pembulatan);
      setFloatingBar(res.floating_bar_visible);
      setDropZone(res.drop_zone_visible);

      if (res.skin && res.skin !== "default") {
        const parts = res.skin.split("-");
        if (parts.length === 2) {
          props.setTheme(parts[0]);
          props.setAccent(parts[1]);
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  onMount(() => {
    loadSettings();
  });

  const handleSaveSettings = async () => {
    const currSettings = settings();
    if (!currSettings) return;

    const skinValue = `${props.theme}-${props.accent}`;
    const updated: AppSettings = {
      ...currSettings,
      language: props.lang,
      skin: skinValue,
      adzan_sound_enabled: soundEnabled(),
      adzan_file_path: adzanPath().trim(),
      always_on_top: alwaysOnTop(),
      autostart: autostart(),
      floating_bar_visible: floatingBar(),
      drop_zone_visible: dropZone(),
      pembulatan: pembulatan(),
    };

    try {
      await invoke("save_settings", { settings: updated });
      setSettings(updated);
      setStatus({
        tone: "success",
        text:
          props.lang === "Indonesia"
            ? "Pengaturan berhasil disimpan."
            : "Settings successfully saved.",
      });
    } catch (e) {
      console.error("Failed to save settings:", e);
      setStatus({
        tone: "error",
        text:
          props.lang === "Indonesia"
            ? "Gagal menyimpan pengaturan."
            : "Failed to save settings.",
      });
    }
  };

  const Switch = (p: {
    checked: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={p.checked}
      aria-label={p.label}
      onClick={p.onToggle}
      class={`toggle-pill ${p.checked ? "active" : ""}`}
    >
      <span class="toggle-knob" aria-hidden="true" />
    </button>
  );

  return (
    <div class="page-stack animate-fade-in">
      <Show when={status()}>
        {(s) => (
          <div class={`status-banner tone-${s().tone}`} role="status">
            {s().text}
          </div>
        )}
      </Show>

      <section class="settings-section surface-card">
        <div class="settings-title">
          {props.lang === "Indonesia"
            ? "Tampilan & Tema"
            : "Appearance & Style"}
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia" ? "Tema Tampilan" : "Color Theme"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Terang, Gelap, atau Sepia"
                : "Light, Dark, or Sepia focus"}
            </div>
          </div>
          <div class="theme-btns" style={{ width: "auto", gap: "4px" }}>
            <For each={["light", "dark", "sepia"]}>
              {(t) => (
                <button
                  type="button"
                  onClick={() => props.setTheme(t)}
                  class={`theme-btn ${props.theme === t ? "active" : ""}`}
                >
                  {themeLabel(props.lang, t)}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia" ? "Warna Aksen" : "Accent Highlight"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia" ? "Aksen aktif:" : "Active accent:"}{" "}
              <span
                class="text-fg"
                style={{ "font-weight": "600", "text-transform": "capitalize" }}
              >
                {props.accent}
              </span>
            </div>
          </div>
          <div class="accent-dots">
            <For each={ACCENTS}>
              {(a) => (
                <button
                  type="button"
                  onClick={() => props.setAccent(a.id)}
                  style={{ background: a.color }}
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={props.accent === a.id}
                  class={`accent-dot-btn ${props.accent === a.id ? "active" : ""}`}
                />
              )}
            </For>
          </div>
        </div>
      </section>

      <section class="settings-section surface-card">
        <div class="settings-title">
          {props.lang === "Indonesia" ? "Bahasa" : "Language Preferences"}
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            {props.lang === "Indonesia" ? "Bahasa Aplikasi" : "App Language"}
          </div>
          <select
            value={props.lang}
            onChange={(e) => props.setLang(e.currentTarget.value)}
            class="date-select"
            style={{ width: "180px" }}
          >
            <option value="Indonesia">Bahasa Indonesia</option>
            <option value="English">English</option>
          </select>
        </div>
      </section>

      <section class="settings-section surface-card">
        <div class="settings-title">
          {props.lang === "Indonesia" ? "Suara & Adzan" : "Audio Alarms"}
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia"
                ? "Aktifkan Suara Adzan"
                : "Enable Adzan Sound"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Mainkan suara adzan saat waktu sholat tiba"
                : "Plays audio file on prayer times"}
            </div>
          </div>
          <Switch
            checked={soundEnabled()}
            onToggle={() => setSoundEnabled(!soundEnabled())}
            label={
              props.lang === "Indonesia"
                ? "Aktifkan suara adzan"
                : "Enable adzan sound"
            }
          />
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia"
                ? "File Adzan Kustom"
                : "Custom Adzan File"}
            </div>
            <div
              class="settings-row-sub"
              style={{ "max-width": "16rem", "word-break": "break-all" }}
            >
              {adzanPath()
                ? adzanPath()
                : props.lang === "Indonesia"
                  ? "Menggunakan adzan bawaan"
                  : "Using default adzan.mp3"}
            </div>
          </div>
          <input
            type="text"
            placeholder={
              props.lang === "Indonesia"
                ? "Path file suara (MP3)"
                : "Audio sound path (MP3)"
            }
            value={adzanPath()}
            onInput={(e) => setAdzanPath(e.currentTarget.value)}
            class="field-input"
            style={{ width: "160px", "font-size": "12px" }}
          />
        </div>
      </section>

      <section class="settings-section surface-card">
        <div class="settings-title">
          {props.lang === "Indonesia"
            ? "Sistem & Integrasi"
            : "System Integrations"}
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia" ? "Mulai Otomatis" : "Start on Boot"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Jalankan Shollu otomatis saat login"
                : "Launch application on OS startup"}
            </div>
          </div>
          <Switch
            checked={autostart()}
            onToggle={() => setAutostart(!autostart())}
            label={
              props.lang === "Indonesia" ? "Mulai otomatis" : "Start on boot"
            }
          />
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia" ? "Selalu di Atas" : "Always on Top"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Pin jendela Shollu agar tidak tertutup"
                : "Keep Shollu windows layered above others"}
            </div>
          </div>
          <Switch
            checked={alwaysOnTop()}
            onToggle={() => setAlwaysOnTop(!alwaysOnTop())}
            label={
              props.lang === "Indonesia" ? "Selalu di atas" : "Always on top"
            }
          />
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia"
                ? "Bilah Melayang"
                : "Floating Bar Widget"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Tampilkan strip info waktu sholat horizontal melayang"
                : "Show compact floating horizontal info bar"}
            </div>
          </div>
          <Switch
            checked={floatingBar()}
            onToggle={handleToggleFloatingBar}
            label={
              props.lang === "Indonesia" ? "Bilah melayang" : "Floating bar"
            }
          />
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">
              {props.lang === "Indonesia"
                ? "Zona Tarik (Drop Zone)"
                : "Drop Zone Widget"}
            </div>
            <div class="settings-row-sub">
              {props.lang === "Indonesia"
                ? "Tampilkan widget kecil penghitung mundur melayang"
                : "Show small floating countdown overlay zone"}
            </div>
          </div>
          <Switch
            checked={dropZone()}
            onToggle={handleToggleDropZone}
            label={props.lang === "Indonesia" ? "Drop zone" : "Drop zone"}
          />
        </div>
      </section>

      <div
        class="settings-save-bar"
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          "padding-bottom": "24px",
        }}
      >
        <span
          class="text-subtle"
          style={{ "font-size": "11px", "font-style": "italic" }}
        >
          {props.lang === "Indonesia"
            ? "Perubahan tema & bahasa diterapkan langsung"
            : "Theme & language changes apply instantly"}
        </span>
        <button
          type="button"
          onClick={handleSaveSettings}
          class="btn btn-primary"
        >
          {props.lang === "Indonesia" ? "Simpan Pengaturan" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
