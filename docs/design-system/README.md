# Shollu Modern — Design System

This folder contains the current UI design reference and earlier prototype materials. For the working v1 interface, follow the implemented Tenang/Ringkas handoff in `src/App.tsx`, `src/shell.css`, `src/components/prayer-pages.css`, and `src/components/utility-pages.css`. The HTML previews and `ui_kits/shollu-app/` prototype are archival proposals and may differ from the runtime app.

Shollu Modern is a desktop prayer-times application modernizing Shollu by **Ebta Setiawan** (2004–2012). The project uses Tauri 2, SolidJS, TypeScript, and Tailwind CSS v4. Original attribution and license terms remain documented in the repository's root files.

## Current v1 interface

- Two layouts: **Tenang**, with the full navigation rail and page content, and **Ringkas**, with compact tabs and a status strip.
- Seven pages: Main, Schedule, Reminders, Convert, Location, Settings, and About. Floating Bar and Drop Zone are separate optional windows.
- Three themes: light, dark, and sepia. Five accents: teal, indigo, emerald, rose, and slate.
- Default window: 960×660 px; minimum: 600×480 px.
- Offline bundled typefaces: Inter, Inter Tight, and JetBrains Mono. Numeric readouts use the mono font where defined in the implementation.
- The current CSS in `src/App.css`, `src/shell.css`, `src/components/prayer-pages.css`, and `src/components/utility-pages.css` defines actual tokens, page layout, and interaction states.

The app is bilingual (Indonesian and English). Keep user-facing copy concise and respectful, and retain clear attribution to Ebta Setiawan in the About experience.

## Brand and design guidance

Teal and gold remain the brand colors associated with the app icon. The current CSS defines the exact theme and accent values; use those tokens in production UI instead of copying prototype values. Prefer legible hierarchy, calm surfaces, clear focus states, and compact desktop layouts. Preserve the user's selected theme and accent through the existing settings model.

Use the app's in-tree icon components in `src/components/Icons.tsx` for production screens. Prototype icon artwork and old asset paths in the previews are not production dependencies.

## Historical prototype material

`preview/`, `colors_and_type.css`, and `ui_kits/shollu-app/` capture earlier visual concepts. The app UI kit is an interactive React/Babel mock with static sample data; it is not the production app and is not a source of truth for current behavior. The colors/type sheet and preview pages may also describe font families, component patterns, or sizing that differ from the shipped implementation.

## Files

- `SKILL.md` — guidance for using these references during design work.
- `ui_kits/shollu-app/README.md` and `index.html` — archival interactive prototype.
- `preview/` and `colors_and_type.css` — archival token and component explorations.
- `src/App.css`, `src/shell.css`, `src/components/prayer-pages.css`, `src/components/utility-pages.css` — current production style implementation.
