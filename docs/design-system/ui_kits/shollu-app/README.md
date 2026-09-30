# Shollu Modern — Archival App UI Kit

This is an earlier interactive React/Babel prototype, retained as a design artifact. It predates the current Tenang/Ringkas handoff and does not define current app routes, behavior, typography, or layout. For production UI, use `src/App.tsx`, `src/shell.css`, `src/components/prayer-pages.css`, and `src/components/utility-pages.css`.

The mock uses a 900×600 simulated window, static sample prayer data, and remote Google Fonts. Current v1 uses a 960×660 default Tauri window (minimum 600×480), bundled offline Inter, Inter Tight, and JetBrains Mono, and live backend data.

## Prototype contents

The mock includes Main, Location, Schedule, Tasks, Convert, Settings, and About screens, plus theme/accent/sidebar controls. These are prototype interactions and sample values; consult production code to determine current behavior.

| File | Contents |
|---|---|
| `index.html` | Prototype shell and React/Babel entry |
| `components/Icons.jsx` | Hand-authored SVG mock icons |
| `components/Pages.jsx` | Prototype page views and static examples |
| `components/App.jsx` | Prototype navigation and tweaks panel |

## Current production reference

The current app uses SolidJS and Tauri 2. Its primary layouts are Tenang and Ringkas. It has three themes (light, dark, sepia), five accents (teal, indigo, emerald, rose, slate), seven pages, and optional Floating Bar and Drop Zone windows. Production icons are in `src/components/Icons.tsx`; styles and exact tokens are in the current CSS modules listed above.
