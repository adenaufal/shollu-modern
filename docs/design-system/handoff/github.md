repo: adenaufal/shollu-modern
branch: main
path: src

## Last sync
date: 2026-08-19T02:47:27Z

### Updated in this project
- Recreated the current Tauri/SolidJS main window (all 7 pages) as a single Design Component, light theme + teal accent.
- Recreated the FloatingBar and DropZone overlay windows.
- Copied app icons and logo from `public/`.

## Screen map
| Project screen | Repo files |
| --- | --- |
| Shollu Modern — Current UI.dc.html · app shell (sidebar, header, nav) | src/App.tsx, src/App.css, src/components/Icons.tsx |
| · Utama (main) | src/components/MainPage.tsx, src/components/QiblaCompass.tsx, src/helpers.ts |
| · Lokasi | src/components/LocationPage.tsx |
| · Jadwal | src/components/SchedulePage.tsx |
| · Pengingat | src/components/TasksPage.tsx |
| · Konversi | src/components/ConvertPage.tsx |
| · Pengaturan | src/components/SettingsPage.tsx |
| · Tentang | src/components/AboutPage.tsx |
| · FloatingBar / DropZone overlays | src/components/FloatingBar.tsx, src/components/DropZone.tsx |
| Design tokens (colors, type, spacing, shadows) | src/App.css |
| Icons + assets | src/components/Icons.tsx, public/icon-32.png, public/icon-128.png, public/logo.svg |
