# UI Design Plan

The original Shollu used a fixed 600×400-ish window with a left-side icon nav and a swapping content frame on the right. The visual language was Windows XP–Vista era: bevelled buttons, gradient title bars, 40 skin variants for tinting.

Shollu Modern keeps the **information architecture** (the user's mental model is intact) but updates the **visual language** to current desktop conventions: flat surfaces, soft shadows, native scrollbars, accessible focus rings, responsive layout, system-aware light/dark theme.

## Information architecture

The original's 8-item nav maps cleanly to a modern sidebar:

```
┌───────────────┬──────────────────────────────────────────────┐
│   logo        │                                              │
│   Shollu      │       Active page content                    │
│   Modern      │       (Main / Location / Schedule / etc.)    │
│               │                                              │
│   ●  Main     │                                              │
│   ○  Location │                                              │
│   ○  Schedule │                                              │
│   ○  Tasks    │                                              │
│   ○  Convert  │                                              │
│   ○  Settings │                                              │
│   ○  About    │                                              │
│               │                                              │
│   [tray on]   │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

(`Message` and `Bar` from the original are no longer top-level pages — `Message` is a transient modal triggered by the scheduler; `Bar` and `DropZone` are separate optional floating windows toggled from Settings.)

## Main page — the daily view

The most-used screen. Designed to be glanceable.

```
┌─────────────────────────────────────────────────────────────────┐
│ Jakarta, Indonesia                          Wed, 20 May 2026    │
│ -6.21°, 106.85°, 7 m  •  WIB (+07:00)       2 Dzulqa'dah 1447 H │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│             NEXT  Asr  in  2h 14m                               │
│                   15:23                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Yesterday    Today           Tomorrow                          │
│                                                                 │
│  Fajr     04:39      04:39 ●  04:39                            │
│  Sunrise  05:58      05:58    05:58                            │
│  Dhuhr    11:51  ✓   11:51 ●  11:51                            │
│  Asr      15:13  ✓   15:23    15:23                            │
│  Maghrib  17:46      17:46    17:46                            │
│  Isha     18:58      18:58    18:58                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Qibla direction  →  295° W-NW                                  │
│         (compass widget: SVG circle + arrow)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- The "NEXT" hero is the focal point: large type, live countdown.
- Times shown for 3 days (yesterday/today/tomorrow) like the original, but with `✓` marks for completed times and `●` highlighting next.
- Qibla compass is a small SVG widget — interactive (rotates with device heading on supported platforms; static otherwise).
- Hijri date appears alongside Gregorian in the header.

## Location settings

```
┌─────────────────────────────────────────────────────────────────┐
│ Location                                                        │
├─────────────────────────────────────────────────────────────────┤
│  Area name      [ Jakarta                            ]          │
│  Latitude       [ -6.2088     ]    [  Pick on map  ▾]           │
│  Longitude      [ 106.8456    ]    [ Browse cities ▾]           │
│  Altitude (m)   [ 7           ]                                 │
│  Timezone       [ UTC+07:00 ▾ ]                                 │
│                                                                 │
│  Calculation method                                             │
│    ○ Karachi (Univ. Islamic Science)                            │
│    ● ISNA (North America)                                       │
│    ○ Muslim World League                                        │
│    ○ Umm Al-Qura (Saudi Arabia)                                 │
│    ○ Egypt General Survey                                       │
│    ○ Custom    Fajr [ 15.0° ]    Isha [ 15.0° ]                 │
│                                                                 │
│  Madhab (Asr)   ● Shafi'i    ○ Hanafi                           │
│                                                                 │
│  Adjustments (minutes)                                          │
│    Fajr   [  0 ]    Dhuhr   [ 0 ]    Asr  [ 0 ]                 │
│    Maghrib[  0 ]    Isha    [ 0 ]                               │
│                                                                 │
│                          [ Cancel ]   [ Save location ]         │
└─────────────────────────────────────────────────────────────────┘
```

City picker is a slide-over panel: searchable across the SQLite cities DB, with autocomplete.

## Theming

The original ships 40 colour skins; modern Shollu replaces this with a smaller, system-aware palette set:

- **System** (auto-follows OS light/dark)
- **Light**
- **Dark**
- **Sepia / Warm** (low-blue evening mode — useful around Maghrib/Isha)
- **High contrast** (a11y)
- **5 accent variants** (Teal, Indigo, Emerald, Rose, Slate) layered over any base mode.

All themes are defined as CSS custom properties in `:root[data-theme=...]` and combined with `[data-accent=...]`. No image-based skinning.

## Typography & density

- **Headings:** Inter Tight or Geist (variable weight 400-700).
- **Body:** Inter (400/500).
- **Numbers (prayer times):** tabular-nums variant — prevents jitter in the countdown.
- **Arabic:** Noto Naskh Arabic (only on the About + prayer-name labels in Arabic display mode).

Default density is "comfortable"; a "compact" toggle in Settings reduces row heights for users who want more on screen.

## Accessibility

- Keyboard navigation throughout (focusable nav, settings forms, modal traps).
- WCAG AA contrast for all themes (verified in CI via a contrast test for the token set).
- Reduced-motion respected via `prefers-reduced-motion`: disables the countdown animation, prayer-row pulse.
- Screen-reader friendly: nav buttons have `aria-current="page"`; live region for the countdown (polite, every 60s).

## Cross-platform window chrome

- **Windows:** custom title bar (frameless) with native-style min/max/close on right, app title on left. Mica/acrylic background where supported.
- **macOS:** native title bar with traffic lights; `hiddenTitleBar` style to integrate the sidebar.
- **Linux:** decorated by the WM by default; provide a CSD option for GNOME.

## Tray / system integration

System tray icon shows the next prayer's countdown as a tooltip. Right-click menu (mirrors the original's Popup1):

```
Shollu Modern
─────────────
✓ Show / Hide window
  Snooze adzan
  Skip next prayer
─────────────
  Bar  ▸  Show / Hide / Always on top
  Drop zone  ▸  Show / Hide / Position
─────────────
  Settings…
  Open schedule…
  Convert date…
─────────────
  Exit
```

## What's intentionally left out (vs. original)

The following were in the original but won't ship in Shollu Modern unless requested:

- **40 individual skin BMPs** — replaced by the theming system above.
- **MovingText scheduled task type** — niche, hard to implement well cross-platform.
- **Shutdown / Hibernate scheduled tasks** — still possible (Tauri command), but gated behind an "advanced" toggle since modern UX prefers user-initiated power actions.

These can be reintroduced if users miss them.
