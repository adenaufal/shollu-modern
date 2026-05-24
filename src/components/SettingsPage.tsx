import { createSignal, onMount, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

interface SettingsPageProps {
  lang: string;
  setLang: (l: string) => void;
  theme: string;
  setTheme: (t: string) => void;
  accent: string;
  setAccent: (a: string) => void;
}

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
  adzan_sound_enabled: boolean;
  adzan_file_path: string;
  always_on_top: bool;
  autostart: bool;
}

const ACCENTS = [
  { id: "teal", color: "oklch(0.72 0.17 208)", label: "Teal" },
  { id: "indigo", color: "oklch(0.67 0.18 270)", label: "Indigo" },
  { id: "emerald", color: "oklch(0.72 0.17 155)", label: "Emerald" },
  { id: "rose", color: "oklch(0.70 0.18 10)", label: "Rose" },
  { id: "slate", color: "oklch(0.567 0.028 210)", label: "Slate" }
];

export function SettingsPage(props: SettingsPageProps) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);

  // Field states for manual settings page binding
  const [soundEnabled, setSoundEnabled] = createSignal<boolean>(true);
  const [adzanPath, setAdzanPath] = createSignal<string>("");
  const [alwaysOnTop, setAlwaysOnTop] = createSignal<boolean>(false);
  const [autostart, setAutostart] = createSignal<boolean>(false);
  const [pembulatan, setPembulatan] = createSignal<number>(0);

  // Load settings on mount
  const loadSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      setSettings(res);
      setSoundEnabled(res.adzan_sound_enabled);
      setAdzanPath(res.adzan_file_path);
      setAlwaysOnTop(res.always_on_top);
      setAutostart(res.autostart);
      setPembulatan(res.pembulatan);

      // Parse theme and accent from Rust `skin` field (formatted as "{theme}-{accent}")
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

  // Save modified settings back to Rust backend
  const handleSaveSettings = async () => {
    const currSettings = settings();
    if (!currSettings) return;

    // Package current theme and accent as `skin` field
    const skinValue = `${props.theme}-${props.accent}`;

    const updated: AppSettings = {
      ...currSettings,
      language: props.lang,
      skin: skinValue,
      adzan_sound_enabled: soundEnabled(),
      adzan_file_path: adzanPath().trim(),
      always_on_top: alwaysOnTop(),
      autostart: autostart(),
      pembulatan: pembulatan()
    };

    try {
      await invoke("save_settings", { settings: updated });
      setSettings(updated);
      alert(props.lang === "Indonesia" ? "Pengaturan berhasil disimpan!" : "Settings successfully saved!");
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  return (
    <div class="content-scroll animate-fade-in space-y-4 max-w-lg mx-auto">
      
      {/* Visual Customization Options */}
      <div class="settings-section select-none">
        <div class="settings-title select-none">
          {props.lang === "Indonesia" ? "Tampilan & Tema" : "Appearance & Style"}
        </div>

        {/* Theme Buttons */}
        <div class="settings-row select-none">
          <div class="select-none">
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Tema Tampilan" : "Color Theme"}</div>
            <div class="settings-row-sub select-none">{props.lang === "Indonesia" ? "Terang, Gelap, atau Sepia" : "Light, Dark, or Sepia focus"}</div>
          </div>
          <div class="flex gap-1 select-none">
            <For each={["light", "dark", "sepia"]}>
              {(t) => (
                <button
                  onClick={() => props.setTheme(t)}
                  class={`theme-btn select-none capitalize ${props.theme === t ? "active" : ""}`}
                >
                  {t}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Accent Colors Dots */}
        <div class="settings-row select-none">
          <div class="select-none">
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Warna Aksen" : "Accent Highlight"}</div>
            <div class="settings-row-sub select-none">{props.lang === "Indonesia" ? "Aksen aktif:" : "Active accent:"} <span class="capitalize font-semibold text-slate-800 dark:text-slate-200">{props.accent}</span></div>
          </div>
          <div class="accent-dots select-none">
            <For each={ACCENTS}>
              {(a) => (
                <button
                  onClick={() => props.setAccent(a.id)}
                  style={{ background: a.color }}
                  title={a.label}
                  class={`accent-dot-btn select-none ${props.accent === a.id ? "active" : ""}`}
                />
              )}
            </For>
          </div>
        </div>
      </div>

      {/* i18n Mappings */}
      <div class="settings-section select-none">
        <div class="settings-title select-none">
          {props.lang === "Indonesia" ? "Bahasa" : "Language Preferences"}
        </div>
        <div class="settings-row select-none">
          <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Bahasa Aplikasi" : "App Language"}</div>
          <select
            value={props.lang}
            onChange={(e) => props.setLang(e.currentTarget.value)}
            class="date-select select-none text-slate-800 dark:text-slate-200"
            style={{ width: "180px" }}
          >
            <option value="Indonesia">Bahasa Indonesia</option>
            <option value="English">English</option>
          </select>
        </div>
      </div>

      {/* Audio Setup */}
      <div class="settings-section select-none">
        <div class="settings-title select-none">
          {props.lang === "Indonesia" ? "Suara & Adzan" : "Audio Alarms"}
        </div>
        <div class="settings-row select-none">
          <div>
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Aktifkan Suara Adzan" : "Enable Adzan Sound"}</div>
            <div class="settings-row-sub select-none">{props.lang === "Indonesia" ? "Mainkan suara adzan saat waktu sholat tiba" : "Plays audio file on prayer times"}</div>
          </div>
          <div
            onClick={() => setSoundEnabled(!soundEnabled())}
            class={`toggle-pill cursor-pointer ${soundEnabled() ? "active" : ""}`}
          >
            <div class="toggle-knob" />
          </div>
        </div>

        <div class="settings-row select-none">
          <div>
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "File Adzan Kustom" : "Custom Adzan File"}</div>
            <div class="settings-row-sub select-none select-none max-w-xs break-all">
              {adzanPath() ? adzanPath() : (props.lang === "Indonesia" ? "Menggunakan adzan bawaan" : "Using default adzan.mp3")}
            </div>
          </div>
          <input
            type="text"
            placeholder={props.lang === "Indonesia" ? "Path file suara (MP3)" : "Audio sound path (MP3)"}
            value={adzanPath()}
            onInput={(e) => setAdzanPath(e.currentTarget.value)}
            class="field-input text-slate-800 dark:text-slate-200 select-none text-xs"
            style={{ width: "160px" }}
          />
        </div>
      </div>

      {/* Native OS Settings */}
      <div class="settings-section select-none">
        <div class="settings-title select-none">
          {props.lang === "Indonesia" ? "Sistem & Integrasi" : "System Integrations"}
        </div>

        {/* Start with Login */}
        <div class="settings-row select-none">
          <div>
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Mulai Otomatis" : "Start on Boot"}</div>
            <div class="settings-row-sub select-none">{props.lang === "Indonesia" ? "Jalankan Shollu otomatis saat Windows login" : "Launch application on OS startup"}</div>
          </div>
          <div
            onClick={() => setAutostart(!autostart())}
            class={`toggle-pill cursor-pointer ${autostart() ? "active" : ""}`}
          >
            <div class="toggle-knob" />
          </div>
        </div>

        {/* Pin to Top */}
        <div class="settings-row select-none">
          <div>
            <div class="settings-row-label select-none">{props.lang === "Indonesia" ? "Selalu di Atas" : "Always on Top"}</div>
            <div class="settings-row-sub select-none">{props.lang === "Indonesia" ? "Pin jendela Shollu agar tidak tertutup" : "Keep Shollu windows layered above others"}</div>
          </div>
          <div
            onClick={() => setAlwaysOnTop(!alwaysOnTop())}
            class={`toggle-pill cursor-pointer ${alwaysOnTop() ? "active" : ""}`}
          >
            <div class="toggle-knob" />
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <div class="flex justify-end pt-2 select-none pb-8">
        <button
          onClick={handleSaveSettings}
          class="btn btn-primary select-none text-xs font-semibold px-6 py-2 shadow"
        >
          {props.lang === "Indonesia" ? "Simpan Pengaturan" : "Save Settings"}
        </button>
      </div>

    </div>
  );
}
