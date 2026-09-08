# Shollu Modern — App UI Kit

Hi-fi interactive prototype of the Tauri 2 desktop application.  
Design width: **900×600 px** (simulated Tauri window).

## Pages covered

| Page | Route key | Status |
|---|---|---|
| Main (prayer grid + hero + qibla) | `main` | ✅ |
| Location settings (form + method picker) | `location` | ✅ |
| Schedule (date range + table) | `schedule` | ✅ |
| Tasks / Pesan tambahan (list + editor) | `tasks` | ✅ |
| Convert (Hijri ↔ Gregorian) | `convert` | ✅ |
| Settings (theme, accent, audio, system) | `settings` | ✅ |
| About (attribution, ID/EN toggle) | `about` | ✅ |

## Component files

| File | Contents |
|---|---|
| `index.html` | App shell, CSS tokens, React + Babel entry |
| `components/Icons.jsx` | SVG icon components (Lucide-style, 2px stroke) |
| `components/Pages.jsx` | All 7 page components |
| `components/App.jsx` | AppShell, sidebar nav, routing, tweaks panel |

## Tweaks

Click the **Tweaks** button (top toolbar or content header) to open the panel:
- **Theme** — Light / Dark / Sepia
- **Accent** — Teal / Indigo / Emerald / Rose / Slate  
- **Sidebar** — Expanded / Collapsed

## Interaction

- Click any sidebar nav item to switch pages
- Sidebar collapse/expand via the "Collapse ‹" button at the bottom
- Location form has interactive radio buttons (calculation method)
- Convert page has ID/EN language toggle
- About page has ID/EN language toggle
- Settings page wires theme + accent changes live to the app

## Design notes

- Window is 900×600, centered in a dark desktop background
- Fonts loaded from Google Fonts: Inter Tight, Inter, Noto Naskh Arabic
- Icons are hand-rolled SVG in Lucide style (stroke=2, round caps)
- All prayer times are static demo data (Jakarta, ISNA, Shafi'i)
- Countdown "2h 14m" is static — in production, driven by `compute_prayer_times_demo`
- Qibla 295° W-NW is correct for Jakarta → Mecca bearing

## Production mapping

This prototype uses React + Babel for prototyping speed. Production code uses:
- **SolidJS** with `createSignal`, `createStore`, `Show`, `For`
- **Tailwind v4** utility classes (not the raw CSS vars used here)
- **Tauri `invoke()`** for backend data
- **`@solidjs/router`** for hash-based routing
