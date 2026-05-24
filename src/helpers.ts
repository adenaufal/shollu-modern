/* Shared helpers and constants for Shollu Modern */

// Format decimal hours to "HH:MM" string
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Format decimal hours to "HH:MM:SS" string
export function formatHoursFull(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--:--";
  const totalSecs = Math.floor(hours * 3600);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Hijri month names ── */
export const H_MONTHS_ID = [
  "Muharram", "Safar", "Rabi'ul Awal", "Rabi'ul Akhir", "Jumadil Awal", "Jumadil Akhir",
  "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
];

export const H_MONTHS_EN = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
  "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

/* ── Weekday names ── */
export const WEEKDAYS_ID = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ── Short day names (for Gregorian date display) ── */
export const G_DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const G_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Gregorian month names ── */
export const G_MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
];

export const G_MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/* ── Gregorian month names (full) ── */
export const G_MONTHS_FULL_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const G_MONTHS_FULL_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/* ── Prayer names ── */
export const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

/* ── Calculation method names ── */
export function getMethodName(id: number): string {
  switch (id) {
    case 1: return "Karachi";
    case 2: return "ISNA";
    case 3: return "MWL";
    case 4: return "Umm Al-Qura";
    case 5: return "Egypt";
    default: return "ISNA";
  }
}

/* ── Accent definitions ── */
export const ACCENTS = [
  { id: "teal", color: "oklch(0.72 0.17 208)", label: "Teal" },
  { id: "indigo", color: "oklch(0.67 0.18 270)", label: "Indigo" },
  { id: "emerald", color: "oklch(0.72 0.17 155)", label: "Emerald" },
  { id: "rose", color: "oklch(0.70 0.18 10)", label: "Rose" },
  { id: "slate", color: "oklch(0.567 0.028 210)", label: "Slate" }
] as const;

/* ── Interface types shared across components ── */
export interface LocationSettings {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: number;
}

export interface Adjustments {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface AppSettings {
  location: LocationSettings;
  method: number;
  madhab: number;
  adjustments: Adjustments;
  pembulatan: number;
  language: string;
  skin: string;
  adzan_sound_enabled: boolean;
  adzan_file_path: string;
  always_on_top: boolean;
  autostart: boolean;
  floating_bar_visible: boolean;
  drop_zone_visible: boolean;
}

export interface PrayerTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface DateResult {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

export type HijriDate = DateResult;

export interface ScheduledTask {
  id: string;
  name: string;
  task_type: string;
  frequency: string;
  time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  month: number | null;
  message: string;
  file_path: string | null;
  enabled: boolean;
}
