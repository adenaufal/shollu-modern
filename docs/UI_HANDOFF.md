# UI Handoff Brief — Shollu Modern

This document briefs an AI agent (or human contributor) joining the project to handle UI/UX implementation. The backend (Rust) and project foundations are in place; what's left on the visual side is documented here.

Read this whole file first. Then read `docs/ui-design.md` (information architecture + screen specs) and `CLAUDE.md` (project orientation).

---

## What you're working on

**Shollu Modern** is reviving [Shollu](https://github.com/ebta/shollu), Ebta Setiawan's beloved Indonesian prayer-times reminder app (Delphi + KOL, 2004-2012, last update 14 years ago). The original is functional but visually rooted in the Windows XP/Vista era. Your job: build the modern UI per `docs/ui-design.md`, on top of a clean Tauri 2 + SolidJS + Tailwind v4 foundation that already exists.

The user is **adenaufal** (Ade Naufal Ammar), an Indonesian developer. Casual ID/EN code-switching welcome.

## Stack (pinned)

| Layer | Tool | Version |
|---|---|---|
| Runtime | Tauri | 2.11.x |
| UI framework | SolidJS | 1.9.x |
| Language | TypeScript | 5.6.x |
| Styling | Tailwind CSS | 4.0.x (with `@tailwindcss/vite` plugin) |
| Bundler | Vite | 6.x |
| Package manager | pnpm | 11.x |

Don't upgrade major versions without coordination. Patch/minor upgrades are fine.

## Project layout you'll touch

```
src/
├── App.tsx              entry component (currently a demo placeholder — replace)
├── App.css              Tailwind v4 import + @theme tokens (extend as needed)
├── index.tsx            mounts <App />
├── vite-env.d.ts
└── assets/              static SVG / images — add your own here
```

You'll add a typical structure like:
```
src/
├── components/          shared UI primitives (buttons, dialogs, cards…)
├── pages/               top-level routes (MainPage, Settings, About…)
├── lib/                 client-side utilities (date formatting, i18n hook…)
├── stores/              Solid stores for global state (settings, prayer times, locale)
└── styles/              if more CSS files than App.css are needed
```

Routing: project doesn't have one yet. Recommended: [`@solidjs/router`](https://github.com/solidjs/solid-router) (`pnpm add @solidjs/router`). Hash-based routing fits a desktop app fine.

## Don't touch

These are out of scope for the UI work:

- `src-tauri/**` — Rust backend. If you need a new Tauri command, document the requirement and ask for it. Don't write Rust unless explicitly invited.
- `LICENSE.md`, `ATTRIBUTION.md`, `docs/original-license.txt` — license + heritage. Load-bearing legal docs. Don't modify wording. Adding new credits (your own contribution) is fine but Ebta Setiawan's credit and the noncommercial constraints stay.
- Project name, identifier (`id.shollu.modern`), `tauri.conf.json` window title beyond what the spec requires.

## Backend contract — Tauri commands available

Call from frontend with `invoke()` from `@tauri-apps/api/core`:

```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<PrayerTimes>("compute_prayer_times_demo");
```

### Currently implemented

| Command | Input | Returns | Notes |
|---|---|---|---|
| `compute_prayer_times_demo` | — | `PrayerTimes` (see below) | Hardcoded to Jakarta + ISNA + Shafii + today. Use only for early-prototype shells. Will be removed when `compute_prayer_times` (parameterized) lands. |

### Coming soon (see `docs/ROADMAP.md` Phase 2)

| Command | Input | Returns |
|---|---|---|
| `compute_prayer_times` | `{ date_iso, location, method, madhab, adjustments }` | `PrayerTimes` |
| `convert_gregorian_to_hijri` | `{ year, month, day, adjustment }` | `{ year, month, day, weekday }` |
| `convert_hijri_to_gregorian` | `{ year, month, day, adjustment }` | `{ year, month, day, weekday }` |
| `qibla_bearing` | `{ latitude, longitude }` | `{ degrees, cardinal }` |
| `search_cities` | `{ query, limit }` | `City[]` |
| `list_regions` | — | `Region[]` |
| `cities_by_region` | `{ region_id }` | `City[]` |
| `get_settings` / `save_settings` / `import_legacy_settings` | — / `Settings` / — | `Settings` |
| `get_languages` / `get_translations` | — / `{ lang_id }` | `LanguageMeta[]` / `Record<string,string>` |
| `list_tasks` / `upsert_task` / `delete_task` | — / `Task` / `{ task_id }` | `Task[]` / `Task` / — |
| `play_adzan` / `stop_audio` | `{ file_path }` / — | — |

If a command you need isn't listed, **add it to ROADMAP.md as a new B-row** and flag it to the backend collaborator — don't fake/mock past the prototype stage.

### Type shapes (TypeScript)

Mirror the Rust types in `src-tauri/src/`. Suggested location: `src/lib/types.ts`.

```ts
export type PrayerTimes = {
  fajr: number;     // fractional hours past local midnight, e.g. 4.732 = 04:43:55
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

export type Location = {
  latitude: number;       // degrees, positive N
  longitude: number;      // degrees, positive E
  altitude: number;       // metres
  tz_hours: number;       // e.g. 7.0 for WIB
};

export type Method =
  | "Karachi"      // Fajr 18°, Isha 18°
  | "Isna"         // Fajr 15°, Isha 15°
  | "Mwl"          // Fajr 18°, Isha 17°
  | "UmmAlQura"    // Fajr 19°, Isha 18°  (Shollu's values; modern std differs)
  | "Egypt"        // Fajr 19.5°, Isha 17.5°
  | { Custom: { fajr_angle: number; isha_angle: number } };

export type Madhab = "Shafii" | "Hanafi";

export type Adjustments = {
  fajr: number;     // minute offset, positive = later
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};
```

## Design system — already started

`src/App.css` sets the Tailwind v4 `@theme` directive with a starter palette and font tokens:

```css
@theme {
  --color-shollu-50:  oklch(0.98 0.01 200);
  --color-shollu-500: oklch(0.62 0.14 200);
  --color-shollu-900: oklch(0.25 0.06 200);
  --font-display: "Inter Tight", "Inter", system-ui, sans-serif;
  --font-numeric: "Inter", system-ui, sans-serif;
}
```

Extend this with the full design system. Suggested additions:

- **Color modes:** light + dark + sepia (low-blue evening). Use `data-theme` attribute on `<html>` and define each mode's tokens under `@theme` selectors or `:root[data-theme=…]`.
- **Accent variants:** Teal (default), Indigo, Emerald, Rose, Slate. Use `data-accent` attribute. Layered on top of mode.
- **Type scale:** display (32px+), heading (20-24px), body (15-16px), caption (12-13px).
- **Spacing:** Tailwind's default rem-based scale is fine. Don't introduce a custom token unless needed.
- **Motion:** respect `prefers-reduced-motion`. Default durations 150ms (instant), 250ms (transitions), 400ms (large surfaces).
- **Tabular numbers:** apply `font-variant-numeric: tabular-nums` (already defined as `.tabular` helper) to anything counting down or displaying prayer times.

Original used 40 BMP skin variants. **We don't replicate that.** The CSS theme system covers the spirit without the bloat.

## Component priority order

Build in this order — earlier components unlock later ones, and the user gets a usable app fastest.

### Tier 1 — minimal walkable app

1. **U0 Theming system** — set up `data-theme` switch + dark/light + Tailwind tokens. Demonstrate by toggling.
2. **U1 `<AppShell>`** — sidebar nav (8 items: Main / Location / Schedule / Tasks / Convert / Settings / About + room for spillover) + content area + responsive collapse below 720px width.
3. **U2 `<About>`** — easiest page. Static content from `ATTRIBUTION.md`, ID/EN toggle, Ebta credit prominent. Link out to ebsoft.web.id.
4. **U3 `<MainPage>`** — the everyday view. See `docs/ui-design.md` for the layout. Wire to `compute_prayer_times_demo` initially; swap to parameterized command once available. Include hero countdown ("NEXT Asr in 2h 14m"), 3-day grid (Yesterday/Today/Tomorrow), qibla compass (inline SVG).

After Tier 1, the app is demoable. Open a PR, get feedback.

### Tier 2 — configurability

5. **U4 `<LocationSettings>`** — once `get_settings`/`save_settings` are ready. Form with lat/lon/altitude/timezone/method/madhab/adjustments.
6. **U5 `<CityPicker>`** — slide-over panel. Search input, region tree, city list. Backed by `search_cities` + `list_regions`.
7. **U6 `<HijriConverter>`** — small page with two date pickers (Gregorian + Hijri), bidirectional conversion. Trivial UI once `convert_*` commands land.

### Tier 3 — power features

8. **U7 `<Settings>`** — general prefs (theme, language, audio, format, autostart, density).
9. **U13 i18n integration** — Solid context with locale switch. Default Indonesian or English based on OS locale.
10. **U14 `<Tray>` (logic)** — wire `tauri-plugin-tray`. Tooltip = next prayer countdown. Popup menu mirrors `docs/ui-design.md` spec.

### Tier 4 — scheduling + side windows

11. **U8 `<ScheduleView>`** — table of prayer times across a date range with export (CSV/HTML).
12. **U9 `<TaskEditor>`** — the "Pesan tambahan" feature. Task types: Informasi / Peringatan / Tulisan bergerak / Multimedia / Command / Shutdown / Hibernate / Pertanyaan. Frequencies: Harian / Mingguan (+day) / Bulanan (+date) / Sekali / Ketika Start.
13. **U10 `<MessageDialog>`** — modal triggered by scheduler when prayer time arrives. Adzan playback control.
14. **U11 `<FloatingBar>`** — second Tauri window (`tauri::WebviewWindowBuilder`), borderless, horizontal strip, always-on-top, shows countdown.
15. **U12 `<DropZone>`** — third Tauri window, mini square widget, draggable, always-on-top.

### Tier 5 — polish

16. **U15 a11y audit** — keyboard navigation, ARIA, contrast checks, screen-reader smoke test.

## Visual references

The user has shared 8 screenshots of the original Shollu v3.10 running (provided in the conversation that spawned this handoff). They cover:

1. **Halaman utama (Main page)** — sidebar nav + 3-column prayer times (Kemarin/Hari ini/Besok) + location info + qibla compass
2. **Pengaturan program (App settings)** — skin selector, language, adzan audio per prayer, message dialog options, autostart, format
3. **Waktu sholat (Prayer time settings)** — location form, method picker radios, madhab dropdown, adjustments inputs
4. **Pesan utama (Main reminder)** — notification timing checkboxes
5. **Buat jadwal (Build schedule)** — date range + export format
6. **Pesan tambahan (Additional messages/tasks)** — task list table + inline editor form
7. **Konversi (Hijri converter)** — Gregorian + Hijri date dropdowns, day-of-week display, "Hari ini" button
8. **Tentang program (About)** — long Indonesian/English text, ID/EN toggle buttons, "Buka bantuan" button

Ask the user for these screenshots if not provided. They're the source of truth for **feature parity** — match the information architecture exactly, but modernize the visual language.

## Conventions

### File naming
- Components: `PascalCase.tsx` (e.g., `MainPage.tsx`, `CityPicker.tsx`).
- Hooks/utilities: `camelCase.ts` (e.g., `useLocale.ts`, `formatHours.ts`).
- Styles co-located with component when component-specific; global in `src/styles/`.

### Component structure
Keep components small, typed, accessible. Example skeleton:
```tsx
import { createSignal, Show } from "solid-js";

type Props = {
  prayerTimes: PrayerTimes;
  // …
};

export default function MainPage(props: Props) {
  // …
  return (
    <main class="…">
      {/* content */}
    </main>
  );
}
```

### State
- Local state: Solid signals.
- Shared state: Solid stores (`createStore` from `solid-js/store`).
- Persisted state: settings via `save_settings` Tauri command; in-memory mirror in store.
- No Redux, no MobX, no XState unless a complex feature genuinely needs them.

### Testing
- Not set up yet. When you add a test framework, prefer Vitest (Vite-native).
- Component tests with `@solidjs/testing-library`. Not blocking for MVP.

## Acceptance criteria for any component PR

Before merging:
1. Builds clean: `pnpm build` succeeds.
2. Runs in `pnpm tauri dev` without console errors.
3. Keyboard nav works (Tab through interactive elements, Enter/Space activate, Esc to close modals).
4. Looks correct in light + dark mode.
5. Respects `prefers-reduced-motion`.
6. WCAG AA contrast on text + interactive surfaces.
7. No hardcoded English strings — use the i18n hook (or stub it) so translations slot in later.
8. New Tauri command requirements documented in `docs/ROADMAP.md`.

## Out of scope (don't do)

- Don't redesign the algorithm side (calculation methods, madhab logic). Backend handles all math.
- Don't add commercial integrations, ads, telemetry, analytics, or subscription gates. License prohibits commercial use.
- Don't add a paid theme store or premium features.
- Don't strip Ebta Setiawan's credit.
- Don't switch frameworks (no React, no Vue, no Svelte) — Solid is chosen and pinned.

## Questions and decisions

When unsure between two reasonable design choices, propose both with trade-offs and ask the user. They're an Indonesian dev, Windows 11, comfortable with technical specifics. They appreciate concrete recommendations, not menus of 6 options.

Common decisions you might hit:
- **Default theme on first launch:** suggest "follow OS"
- **Default language on first launch:** suggest "follow OS locale, fallback Indonesian"
- **Default city:** Jakarta (user's test case has been Pekanbaru, but the broader audience is most likely Jakarta)
- **Adzan audio source:** pull from the original Shollu install dir if exists; otherwise ship a CC-licensed set; otherwise prompt user to set their own
- **Sidebar collapsed vs expanded by default:** expanded on desktop ≥ 900px, collapsed below

## Need help?

- Project orientation: `CLAUDE.md`
- Roadmap status: `docs/ROADMAP.md`
- UI spec details: `docs/ui-design.md`
- Pascal source for behavioral reference: `F:\dev\projects\shollu\` (read-only)
- Algorithm details: `docs/prayer-time-algorithm.md`
- Data file formats: `docs/data-formats.md`

Good luck. The original Shollu was loved by a generation of Indonesian Muslims. Making the new one feel modern *and* respectful of that lineage is the assignment.
