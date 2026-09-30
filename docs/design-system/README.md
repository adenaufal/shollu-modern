# Shollu Modern — Design System

A community-driven modernization of [Shollu](https://github.com/ebta/shollu), the beloved Indonesian Islamic prayer-times reminder app originally by **Ebta Setiawan** (2004–2012). This design system documents the visual language, component patterns, and brand assets for the modern rebuild.

**License:** PolyForm Noncommercial 1.0.0  
**Original Author:** Ebta Setiawan — https://ebsoft.web.id  
**Maintainer:** adenaufal (Ade Naufal Ammar)

---

## Sources

- **Codebase:** `shollu-modern/` (Tauri 2 + SolidJS + Tailwind v4 + TypeScript)
- **Figma:** None provided
- **App icon source:** `src-tauri/icons/icon.png` — two-circle teal+gold motif
- **CSS tokens:** `src/App.css` — Tailwind v4 `@theme` block

---

## Product Context

**Shollu Modern** is a desktop application (Windows, macOS, Linux) that shows prayer times for Muslim users, especially in Indonesia. It's a faithful modernization of the original Shollu v3.10, preserving:

- Prayer time calculation (5 methods: ISNA, Karachi, MWL, Umm Al-Qura, Egypt)
- Hijri ↔ Gregorian calendar conversion
- Qibla compass direction
- Scheduled task reminders (adzan playback, notifications)
- System tray integration with countdown

Stack: **Tauri 2** (Rust backend) + **SolidJS** + **TypeScript** + **Tailwind CSS v4** (Vite).

---

## Content Fundamentals

### Tone & Voice
- **Audience:** Indonesian Muslim users, developer community; bilingual (Bahasa Indonesia / English)
- **Tone:** Warm, respectful, technical-but-accessible. Never corporate. Carries heritage.
- **Language switching:** App supports ID/EN toggle. UI strings should be translatable from day one.
- **Casing:** Sentence case for labels (`Prayer times`, not `Prayer Times`). Title case only for proper names (`Shollu Modern`, `Ebta Setiawan`).
- **Prayer names:** Keep Arabic transliterations: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha (not anglicized).
- **Hijri dates:** Display as `2 Dzulqa'dah 1447 H` — suffix H, traditional Indonesian romanization.
- **Numbers:** Always tabular-nums for times/countdowns to prevent layout jitter.
- **Attribution:** Ebta Setiawan's name appears prominently on the About page. Never removed.
- **Emoji:** Not used in the UI. Clean, icon-based only.
- **Error messages:** Friendly, bilingual. `Backend not yet wired:` pattern from existing code.

### Example Copy
- Hero: `NEXT  Asr  in  2h 14m`
- Header: `Jakarta, Indonesia  ·  Rab, 20 Mei 2026  ·  2 Dzulqa'dah 1447 H`
- Nav items: `Main`, `Location`, `Schedule`, `Tasks`, `Convert`, `Settings`, `About`
- About footer: `Based on Shollu by Ebta Setiawan (2004-2012).`

---

## Visual Foundations

### Brand Colors
The app icon defines the brand identity — two interlocking circles in **teal** and **gold**:
- **Teal (primary):** `oklch(0.72 0.17 208)` — bright cyan-teal; used for active states, accents, highlights
- **Gold (secondary):** `oklch(0.80 0.18 84)` — warm amber/gold; used for "next prayer" hero highlight, decorative accents
- Together they evoke the sun and the crescent moon — deeply resonant for an Islamic prayer app

### Color System
Full token scale in `colors_and_type.css`:
- **Teal scale (shollu):** 50–950, hue 200–210
- **Gold scale:** 50–950, hue 80–86
- **Neutral (slate):** standard cool-grey scale for text and surfaces
- **Semantic tokens:** `--bg`, `--surface`, `--fg`, `--fg-muted`, `--border`, `--accent`, `--accent-fg`

**Three base themes** (set via `data-theme` on `<html>`):
- `light` — white surfaces, dark text
- `dark` — near-black surfaces, light text
- `sepia` — warm parchment bg, ideal for Maghrib/Isha use; reduces eye strain

**Five accent variants** (set via `data-accent`): `teal` (default), `indigo`, `emerald`, `rose`, `slate`

### Typography
- **Display / Heading:** `Inter Tight` — variable weight 400–700, tight tracking. Used for prayer names in the hero, section headers.
- **Body:** `Inter` — 400/500, comfortable reading. Used for all UI text.
- **Numeric (prayer times):** `Inter` with `font-variant-numeric: tabular-nums` — prevents time-display jitter during countdown.
- **Arabic:** `Noto Naskh Arabic` — for Arabic-mode prayer name labels and About page Arabic passages.
- **Scale:** display 36–48px · heading 20–28px · body 14–16px · caption 11–13px

### Spacing & Layout
- Uses Tailwind v4's default rem-based scale (4px baseline)
- Sidebar: 220px expanded, 56px collapsed
- Content area: max-width 680px for forms; full-width for the prayer grid
- Cards: `p-4` (16px) or `p-6` (24px) padding

### Corner Radii
- `sm`: 4px — inline elements, badges
- `md`: 8px — buttons, inputs
- `lg`: 12px — cards
- `xl`: 16px — modals, panels
- `full`: 9999px — pills, tray icons

### Shadows
- `sm`: `0 1px 2px oklch(0 0 0 / 0.06)` — subtle lift on buttons
- `md`: `0 2px 8px oklch(0 0 0 / 0.10)` — card surfaces
- `lg`: `0 8px 24px oklch(0 0 0 / 0.18)` — modals, slide-overs

### Backgrounds & Surfaces
- No gradient backgrounds on major surfaces. Gradients only for the hero countdown section (subtle teal→transparent)
- No full-bleed photos. Clean, flat desktop app aesthetic.
- Sidebar: slightly darker than content area in light mode; slightly lighter in dark mode
- `sepia` theme uses warm parchment `oklch(0.97 0.02 75)` base

### Animation & Motion
- **Instant transitions:** 150ms — hover states, button presses
- **Standard transitions:** 250ms ease — sidebar collapse, tab switches
- **Large surface:** 400ms ease-out — modals, slide-over panels
- Respects `prefers-reduced-motion`: disables all transitions and the countdown tick animation
- No bounces or spring physics — calm, purposeful motion
- Prayer row pulse (next prayer highlight) is a gentle opacity animation, disabled under reduced-motion

### Hover & Press States
- Hover: `bg-opacity` shift +10% on surface color, or teal-50 tint in light mode
- Press/active: slight scale-down `scale(0.98)` on buttons
- Focus: 2px solid teal ring with 2px offset — high-contrast, always visible

### Borders
- `border` utility: `oklch(0.90 0.01 200)` in light, `oklch(0.22 0.02 200)` in dark
- Inputs: standard border, teal border-color on focus
- Dividers: `border-t` at 1px

### Iconography
- See **ICONOGRAPHY** section below

### Card Anatomy
- Background: `--surface` (white in light, slate-900 in dark)
- Border: 1px `--border`
- Shadow: `md`
- Radius: `lg` (12px)
- Padding: 16px or 24px depending on density

---

## Iconography

No custom icon font or SVG sprite exists in the codebase yet. The project relies on Tailwind utility classes and plans to use an icon library.

**Recommended approach:** [Lucide Icons](https://lucide.dev) — matches the clean, 2px-stroke flat style expected for this modern desktop app. Available via CDN: `https://unpkg.com/lucide@latest`

**Key icons expected:**
- `mosque` / `clock` — nav and prayer items (Lucide doesn't have a mosque icon; use `clock`, `sun`, `moon`, `compass` as contextual replacements)
- `map-pin` — location
- `calendar` — schedule/convert
- `settings` — settings
- `info` — about
- `check`, `circle`, `arrow-right` — prayer status
- `chevron-left/right` — sidebar collapse
- `volume-2` / `volume-x` — adzan audio

**App icon:** `assets/icon.png` / `assets/icon-128.png` — teal+gold two-circle motif. Use at 32px for tray, 128px for About page.

**Note:** The `assets/logo.svg` is the default SolidJS scaffold logo — it is NOT the Shollu brand logo. Use `icon.png` for brand representation.

---

## File Index

```
/
├── README.md                        ← this file (start here)
├── SKILL.md                         ← agent skill descriptor for Claude Code
├── colors_and_type.css              ← full CSS token system (import in any HTML)
│
├── assets/
│   ├── icon.png                     ← app icon — teal+gold two-circle, 512px
│   ├── icon-32.png                  ← tray icon size
│   ├── icon-128.png                 ← about page / large display
│   ├── tauri.svg                    ← Tauri logo (framework branding)
│   └── logo.svg                     ← SolidJS scaffold logo (NOT the brand icon)
│
├── preview/                         ← Design System tab cards (700px wide)
│   ├── colors-primary.html          ← Teal + Gold full scales (50–950)
│   ├── colors-neutral.html          ← Slate scale + semantic status colors
│   ├── colors-themes.html           ← Light / Dark / Sepia + 5 accent variants
│   ├── type-scale.html              ← Full type size scale (hero → caption)
│   ├── type-specimens.html          ← Inter Tight, Inter, Noto Naskh Arabic
│   ├── spacing-tokens.html          ← Radii, shadows, motion durations
│   ├── components-buttons.html      ← Primary, secondary, ghost, danger, icon
│   ├── components-inputs.html       ← Text inputs, radios, checkboxes, steppers
│   ├── components-nav.html          ← Sidebar expanded/collapsed, light/dark
│   ├── components-prayer-card.html  ← Hero countdown, 3-day grid, qibla SVG
│   └── components-badges.html       ← Prayer status, theme tags, task type chips
│
└── ui_kits/
    └── shollu-app/
        ├── README.md                ← UI kit doc (pages, components, interactions)
        ├── index.html               ← Interactive 900×600 app prototype
        └── components/
            ├── Icons.jsx            ← Lucide-style SVG icon components
            ├── Pages.jsx            ← All 7 page components (Main, Location, …)
            └── App.jsx              ← AppShell, sidebar, routing, tweaks panel
```

---

## UI Kits

### Shollu Modern App (`ui_kits/shollu-app/`)

A hi-fi interactive prototype of the Tauri 2 desktop application. Pages: Main (prayer grid + hero countdown + qibla compass), Location settings, Schedule view, Tasks / Pesan tambahan, Hijri converter, Settings, About. Tweaks panel for theme/accent/sidebar switching.

Design width: **900×600 px** — matches the planned Tauri window size.

Stack note: Prototype uses React + Babel for speed. Production target is SolidJS + Tailwind v4 + Tauri `invoke()`.
