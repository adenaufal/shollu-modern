# Handoff: Shollu Modern — fresh UI (two display modes)

## Overview
A redesign of the Shollu Modern desktop app (Tauri 2 + SolidJS, repo `adenaufal/shollu-modern`). The app keeps every existing capability — prayer-time calculation, qibla, hijri conversion, alarm scheduler, floating overlays, themes, bilingual UI — but the shell is rethought and shipped as **two selectable display modes**:

- **Tenang** ("calm") — 56px icon rail, roomy cards, and a **day-arc**: one horizontal track for the whole day with prayer markers and a live "now" indicator. Replaces the old yesterday/today/tomorrow 3-column table.
- **Ringkas** ("compact") — no sidebar. Top bar + tabs, a full month table as the primary object, a 284px right **inspector** ("what's next", parameters, qibla, alarms) that also edits in place, ⌘K command palette, and a status bar.

The mode is a user setting (Pengaturan → Mode tampilan, also ⌘⇧M). Data, settings, themes and accents are shared; only shell shape and density differ.

Window size target: **960 × 660** (current app minimum is 600 × 480 — the designs are drawn at 960 × 660 and should stay usable when shrunk).

## About the Design Files
`designs/*.dc.html` are **design references authored in HTML**, not production code. They are self-contained streaming prototypes (open directly in a browser; `support.js` must sit next to them, `public/icon-32.png` + `public/icon-128.png` are the real app icons).

The task is to **recreate these designs inside the existing SolidJS + Tailwind v4 app**, reusing its own patterns: the `src/App.css` design-token system (`--accent-*`, `--surface`, `--fg`, `--border`, `--shadow-*`, `[data-theme]`, `[data-accent]`), the existing `src/components/Icons.tsx` set, `QiblaCompass.tsx`, and `helpers.ts`. Do **not** port the inline styles verbatim — the prototypes use literal `oklch()` values only because they cannot reference the app's CSS variables. Every literal below maps to an existing token; use the token.

## Fidelity
**High-fidelity.** Final colors, type, spacing, and states. Recreate pixel-for-pixel with the app's own tokens and components. Layout is fixed-size desktop (no responsive breakpoints); the only fluid axes are the table/list bodies and the day-arc track.

## Files
| File | What it is |
| --- | --- |
| `designs/Shollu Modern - Fresh UI.dc.html` | The redesign. Section "Turn 2" (top) = mode screens `2a` (Tenang) and `2b` (Ringkas). Section "Turn 1" = main screens `1a` (Day Arc → Tenang), `1b` (Ledger → Ringkas), `1c` (Mihrab, not selected). |
| `designs/Shollu Modern - Current UI (recreation).dc.html` | Pixel recreation of the app as it exists today (all 7 pages + FloatingBar + DropZone), for before/after comparison. |
| `designs/support.js` | Runtime needed to open the two `.dc.html` files. |
| `github.md` | Source repo association + screen map. |
| `screenshots/` | PNG previews (1280×800) of every screen. |

## Screens / Views

### Mode Tenang (`2a` + `1a`)

**Shell (all screens).** `display:flex`, window radius 14px, border `--border`, background `--bg`.
- **Icon rail** — 56px wide, `--surface`, right border `--border`, `padding:12px 0`, items centred with `gap:4px`. App icon 30×30 radius 9px, then `margin-bottom:10px`. Nav items 36×36, radius 10px, icon 18px: Utama (Clock), Jadwal (Calendar), Pengingat (CheckSquare), Konversi (ArrowRightLeft), Lokasi (MapPin); `flex:1` spacer; then Pengaturan (Settings), Tentang (Info). Active = `--accent-500` fill, `--accent-fg` icon. Idle = `--fg-muted`; hover = `--bg-hover` + `--fg`. Tooltip = the page name (rail is icon-only by design).
- **Top strip** — 52px, `--surface`, bottom border. Left: location name (Inter Tight 15/600, −0.01em), coordinates (JetBrains Mono 11px, `--fg-muted`), method pill (11/600, radius 999px, `--bg-hover` bg). Right: Gregorian date (13/500) + hijri date (12px muted). On sub-pages the left slot becomes the page title and the right slot holds page actions.
- **Body** — `padding:20px`, `gap:16px`.

**Utama / Main (`1a`).**
- **Hero card** — `--surface`, radius 16px, `padding:20px 24px 24px`, `--shadow-sm`.
  - Eyebrow "Berikutnya" 10/700, tracking 0.1em, uppercase, muted.
  - Prayer name Inter Tight 38/700 (−0.03em) + countdown Inter 44/700 (−0.04em, `tabular-nums`) in `--accent-500`, baseline-aligned, `gap:12px`.
  - Sub-line 12.5px muted: `pukul {HH:MM} · sekarang {current}, sisa {h}j {mm}m`.
  - Qibla chip right: 46px compass (reuse `QiblaCompass`), label 9/700 uppercase, degrees 15/700 tabular, cardinal 10px; wrapper border `--border`, radius 12px, bg `--bg`.
  - **Day arc** — container `position:relative; height:74px; margin:0 10px`. Track: `absolute; left:0; right:0; top:34px; height:6px; radius:999px;` bg `--bg-hover`. Progress: same box, `width:{nowPct}%`, `linear-gradient(90deg, --accent-200, --accent-500)`. Marker (one per prayer): `absolute; left:{pct}%; transform:translateX(-50%); width:60px`, column-centred — name 9/700 uppercase, tick 2×14px, time 11.5/600 tabular with `margin-top:11px`. Passed markers muted (`oklch(0.68 0.02 210)` ≈ `--fg-subtle`), upcoming darker, **next** marker in `--accent-500` with a 10px dot (3px accent ring, white fill) and time 12.5/700. Now indicator: `left:{nowPct}%`, gold (`--gold-500`) 1×34px line with the current clock above it in 9/700 tabular.
  - **Percent mapping**: the arc spans a fixed 04:00 → 20:00 window (16 h): `pct = (decimalHours − 4) / 16 × 100`. Reference values in the mock: Fajr 5.5%, Syuruq 12.8%, Dhuhr 51.3%, Asr 71.8%, Maghrib 89.2%, Isha 96.4%, now 64.8%. Clamp to 0–100 for locations/seasons outside the window.
- **Bottom row** — `grid-template-columns:1fr 1fr; gap:16px`.
  - Left card "Hari ini" + right-aligned caption "± vs besok": 6 rows, `padding:7px 0`, hairline `oklch(0.96 0.006 208)` between. Each row: 6px status dot, name 13px, time 13/600 tabular, delta 11px in a 38px right-aligned column. Passed rows muted; **current** row gets a full-bleed gold tint (`margin:0 -16px; padding:7px 16px`, bg `oklch(0.98 0.008 84)`) + gold dot; **next** row is accent-coloured with an accent dot.
  - Right column: "Pengingat" card (header + "+ Tambah" accent link; rows = 26px rounded-8 icon tile, name 12.5/600, schedule 10.5px muted, 30×17 toggle) and a gradient info card using `--hero-bg` for the upcoming sunnah-fast note.

**Jadwal (`2a`).** Top strip: month title + prev/next 24px chevron buttons + hijri span caption; right: "Ekspor CSV" / "Cetak" secondary buttons. Body: `flex; gap:16px`.
- Month card (`flex:1`): weekday header row (7 × 9.5/700 uppercase, Friday in accent), then `grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); gap:6px` = 42 cells (Sun before the 1st → Sat after the last). Cell: border `oklch(0.955 0.006 208)`, radius 9px, `padding:6px 7px`, `justify-content:space-between`; top line = Gregorian day 12.5px + hijri day 8.5px muted; bottom = Fajr 9.5px muted and Maghrib 9.5px in gold-ish `oklch(0.54 0.06 84)`. Out-of-month cells bg `--bg`, fg `--fg-subtle`. Today: accent tint bg, accent fg, weight 700.
- Day-detail panel (236px): weekday+date 10/700 uppercase, hijri 11.5px muted, then 6 hairline rows (name 12.5px muted / time 13/600 tabular), and a muted hint at the bottom.

**Pengingat (`2a`).** Top strip action: primary "+ Pengingat baru".
- Card 1 "Adzan waktu sholat" + sub-line + right accent link (`adzan.mp3 · ubah`); `grid-template-columns:repeat(3,1fr); gap:8px` of 6 tiles (border `oklch(0.95 0.006 208)`, radius 10px, `padding:10px 12px`): prayer name 12.5/600 + time 10.5px muted, 30×17 toggle right.
- Card 2 "Pengingat kustom": rows `padding:12px 0` with hairline — 30px rounded-9 type tile (Info = blue `oklch(0.95 0.02 230)` / `oklch(0.38 0.12 230)`, Multimedia = green `oklch(0.95 0.05 145)` / `oklch(0.38 0.14 145)`, Shutdown = red `oklch(0.95 0.04 15)` / `oklch(0.42 0.16 20)`), name 13/600, schedule+message 11px muted, type badge 10/700 radius 6px, toggle, "Hapus" 11.5px muted → danger on hover. Footer note (info icon + 11.5px muted) about the tray.

**Konversi (`2a`).** Centred column, `max-width:660px`, `gap:20px`, body padding `28px 20px`.
- Two cards side by side with a 38px rounded-12 swap button between: label 10/700 uppercase (hijri card label in gold), value line = day Inter Tight 34/700 + month 22/600 + year 20/500 muted, then 3 dropdown-looking fields (`padding:8px 10px`, border, radius 9px, caret ▾).
- Result banner: `--hero-bg`, radius 14px, `padding:18px 20px` — "Hari" eyebrow + weekday Inter Tight 26/700 left, both calendars right-aligned 12.5px/1.7.
- Offset row: label + sub-label left, 3-way segmented control right (`padding:3px`, track `--bg-hover`, radius 10px; selected = `--surface` + `--shadow-sm`).

**Pengaturan (`2a`).** Body = 150px settings nav (pill items, active = `--surface` + shadow) + content column `gap:16px`.
- "Mode tampilan" card: 2-up grid of preview tiles. Selected tile = 2px `--accent-500` border + faint accent bg; each tile holds a 74px miniature wireframe of that mode (rail + hero + two cards vs top bar + rows + inspector), then a radio + name 13/600 + one-line description.
- "Tema & aksen" card: theme segmented control (Terang/Gelap/Sepia) and accent dots (22px, active = 2px `--fg` ring) — same five accents as `helpers.ts` `ACCENTS`.
- "Bahasa" card: Indonesia / English segmented control.

**Tentang (`2a`).** Centred 600px column: 60px rounded-16 icon tile + title Inter Tight 24/700 + meta line; credit card for Ebta Setiawan (name 18/600, years right, 13px/1.65 body, two accent links); community card with a 3-up stat row (17/700 tabular value + 10.5px muted label); footer row with maintainer + "Kunjungi repositori" secondary button.

### Mode Ringkas (`1b` + `2b`)

**Shell (all screens).** Column layout on `--surface`, radius 12px. Hairlines are `oklch(0.93 0.006 210)` (≈ `--border`) and row separators `oklch(0.965 0.004 210)`.
- **Top bar** 44px: 20px app icon + mono breadcrumb `Location / Page` (separator `/` in `oklch(0.78 0.01 210)`), right: "Cari perintah" + ⌘K key cap (mono 10px, radius 4px, `--bg-hover`), optional 28px settings icon button.
- **Tabs** 36px: 12.5px labels, active = `--fg` + `box-shadow:inset 0 -2px 0 --accent-500`; idle muted. Counts render as a mono 10px chip. Right side of the tab strip can hold inline actions (Ekspor CSV / HTML).
- **Body** `flex; min-height:0` — content pane (`flex:1`, right border) + **inspector** 284px on `oklch(0.988 0.003 210)`.
- **Status bar** 26px: mono 10.5px muted, left = context, right = counts/version.
- All numerals in this mode are JetBrains Mono; labels stay Inter.

**Jadwal / main (`1b`).** Table `grid-template-columns:104px repeat(6,1fr)`, header 28px (9.5/700 uppercase, bg `oklch(0.985 0.003 210)`), rows 29px, times right-aligned, date column muted. Today's row: accent tint bg + `box-shadow:inset 2px 0 0 --accent-500`, date and next-prayer cell in `--accent-700`/600. Hover row bg `oklch(0.98 0.003 210)`.
Inspector blocks, top to bottom: "Berikutnya" (name Inter Tight 22/700 + clock mono 12px, countdown mono 28/500 in `--accent-500`, sub-line 11.5px muted) · "Parameter" (Metode / Mazhab as clickable bordered mono chips, Koreksi as six digits, Zona) · Qibla (44px compass + 293.81° mono 15px + cardinal/distance) · "Alarm" (three toggle rows).

**Location (`1b`, English copy).** Same shell, Location tab active. Content pane = label/value rows (`padding:10px 18px`, hairline top): City (name 13/600 + region 11px muted + accent "Change"), Latitude, Longitude, Altitude (mono values in bordered 6px-radius fields), Timezone (plain mono). "Method" = row of mono chips, selected filled `--accent-500`. "Asr madhab" = two mono chips. "Adjustments · minutes" = `repeat(6,1fr)` grid of small mono steppers. Inspector = "Live preview · today" (6 mono rows recomputed live as parameters change) + validation note + `Revert` / `Save ⌘S` buttons pinned to the bottom. Status bar shows unsaved-change count.

**Pengingat (`2b`).** Prayer-adzan block = `repeat(6,1fr)` cells (mono label 10px, time 11.5px, 26×15 toggle) inside hairline rules, with the adzan file as a mono accent link. Custom reminders = table `1fr 92px 96px 46px 54px`, 34px rows, header 26px: name, mono type badge (INFO / MEDIA / SHUTDN), mono schedule, toggle, "Hapus". Inspector = the create form (Nama, Tipe as a wrap of mono chips, Waktu + Frekuensi, Pesan) with `Simpan ⌘S` pinned to the bottom.

**Konversi (`2b`).** Two mono field groups (Masehi | Hijriah) split by a vertical hairline, then "Peta bulan" — a 3-column table (Masehi / Hijriah / Hari) of 27px mono rows with today tinted. Inspector = "Hasil" (weekday Inter Tight 26/700, then both dates + Julian day in mono), offset as a 3-way mono control, `Hari ini` / `Ekspor` buttons.

**Pengaturan (`2b`).** Mode picker as two 58px wireframe tiles (selected = 2px accent border), then label/value rows: Tema, Aksen, Bahasa, Bilah melayang, Drop zone, Selalu di atas, Mulai saat login. Inspector = "Pintasan" list (⌘K, ⌘S, ⌘⇧M, ⌘→, ⌘W) + a note that config is TOML in the user folder.

**Tentang (`2b`).** Identity row (48px icon tile + name + mono tagline), then a `150px 1fr` mono metadata table (versi, lisensi, mesin, validasi, database tempat, metode, platform), then the Ebta credit block with mono links. Inspector = "Perubahan terakhir" changelog + "Repositori" button.

### Overlay windows (both modes, redesigned)
- **FloatingBar, Tenang**: 520×46 pill, radius 23px, `--surface`, `--shadow-lg`; accent dot, prayer name Inter Tight 14/700, countdown 15/700 tabular accent, then a mini 6px arc track (accent fill + gold now-tick), target time 11px muted, 26px close button. `-webkit-app-region: drag` as today; close button `no-drag`.
- **DropZone, Tenang**: 132×132 card, radius 20px; 56px conic-gradient progress ring (`conic-gradient(--accent-500 0 {p}turn, --bg-hover {p}turn 1turn)`) with a 44px white inner circle holding the prayer name, then countdown 16/700 accent and `HH:MM · City` 10.5px muted.
- **FloatingBar, Ringkas**: 470×34 mono strip, radius 8px — `PKU │ ASR 15:29 │ 01:06:50 │ MGH 18:17 │ ISH 19:26` with `│` separators in `oklch(0.85 0.008 210)`, close button right.
- **DropZone, Ringkas**: 152×52 mono block — label/countdown/time stack plus a 4px vertical progress bar on the right.

## Interactions & Behavior
- **Countdown** ticks every second, `font-variant-numeric: tabular-nums` everywhere (keep the existing jitter-free approach). Format: `H:MM:SS` in Tenang, `HH:MM:SS` in Ringkas.
- **Day arc** recomputes `nowPct` on the same 1s tick; markers are static per day. Below the arc, prayer state is derived exactly as today (`isNext`, `isDone` in `MainPage.tsx`).
- **Mode switch** (Pengaturan or ⌘⇧M) swaps the shell only — persist as a new field alongside `skin` in `settings.rs` (suggest `layout_mode: "tenang" | "ringkas"`); no data refetch, no window resize.
- **⌘K palette** (Ringkas): opens over the app, searches pages, cities, and actions (export, toggle overlays, switch mode). Not drawn in these mocks — design before build or ship a minimal page/action list first.
- **Inspector edits** (Ringkas) are live: changing method/madhab/adjustment updates "Live preview · today" immediately; `Revert` / `Save ⌘S` commit, and the status bar counts unsaved changes.
- **Month navigation** (Tenang Jadwal): prev/next month, ⌘←/⌘→; clicking a cell loads the right-hand day detail; export range follows the visible month.
- **Hover**: rail items and list rows lift to `--bg-hover`; table rows to `oklch(0.98 0.003 210)`; "Hapus" turns `--color-danger`; buttons keep the existing `.btn` hover/active (`scale(0.98)` on press).
- **Motion**: reuse `--motion-instant 150ms` for hover/toggles, `--motion-transition 250ms` + `fadeIn` for page changes, `--easing-default`. Respect `prefers-reduced-motion` as `App.css` already does.
- **Loading / error**: keep the existing skeleton (`skeleton-pulse`, `skeleton-block`) and `status-banner tone-error` + Retry pattern; in Ringkas the skeleton is 29px table rows, in Tenang it is the hero + card blocks.
- **Bilingual**: every string shown here exists in both languages (mocks show Indonesian for Tenang/Ringkas screens, English for the two Location screens). Indonesian strings are the longest — the 284px inspector and 236px detail panel were sized for them.

## State Management
Existing signals are enough, plus:
- `layoutMode: "tenang" | "ringkas"` — persisted setting, drives the shell.
- Tenang Jadwal: `visibleMonth` (ISO), `selectedDay` (ISO), `monthTimes: PrayerTimes[]`.
- Ringkas: `activeTab`, `selectedRowDate`, `paletteOpen`, `draftSettings` + `dirtyCount` for the inspector's unsaved state.
- Everything else (`settings`, `todayTimes`, `tomorrowTimes`, `qibla`, `hijriToday`, `tasks`, countdown ticker) is unchanged from the current components.

## Design Tokens
All literals in the prototypes resolve to tokens that already exist in `src/App.css` — use the token, not the literal.

| Prototype literal | Token | Notes |
| --- | --- | --- |
| `oklch(0.51 0.150 208)` | `--accent-500` | primary accent (teal) |
| `oklch(0.52 0.14 208)` | `--accent-600` | links, "today" column head |
| `oklch(0.43 0.115 208)` | `--accent-700` | accent text on tints |
| `oklch(0.95 0.025 208)` / `oklch(0.98 0.01 208)` | `--accent-100` / `--accent-50` | active nav, next-row tint |
| `oklch(0.74 0.175 84)` | `--gold-500` | "now" indicator, current-prayer tint |
| `#ffffff` | `--surface` | cards, bars |
| `oklch(0.985 0.004 210)` | `--bg` | app canvas |
| `oklch(0.94 0.01 208)` / `oklch(0.96 0.006 208)` | `--bg-hover` | hover, segmented tracks |
| `oklch(0.2 0.01 210)` | `--fg` | primary text |
| `oklch(0.55–0.62 0.02 210)` | `--fg-muted` | secondary text |
| `oklch(0.68–0.75 0.02 210)` | `--fg-subtle` | passed times, placeholders |
| `oklch(0.9 0.01 208)` / `oklch(0.93 0.008 208)` | `--border` | window + card borders |
| `oklch(0.88 0.012 208)` | `--border-input` | fields |
| `oklch(0.96 0.006 208)` / `oklch(0.965 0.004 210)` | hairline | row separators (`--border` at ~40%) |
| status colors | `--color-success` / `--color-warning` / `--color-danger` / `--color-info` | badges, delete |
| shadows | `--shadow-sm` / `--shadow-md` / `--shadow-lg` | the 18px/44px window shadow is a mock-only desk shadow — a real OS window has none |

Type: **Inter** (UI/body), **Inter Tight** (display: prayer names, page identity, big numerals), **JetBrains Mono** (Ringkas numerals, coordinates, key caps, metadata). Sizes actually used: 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 17, 18, 20, 21, 22, 24, 26, 28, 34, 38, 40, 44px. Weights 400/500/600/700/800. Tracking: −0.04em on the hero countdown, −0.03em/−0.02em on display text, +0.08–0.1em on uppercase eyebrows.

Radii: 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 23, 999px. Spacing follows the existing 4px scale (`--space-*`); recurring values are 6, 8, 10, 12, 14, 16, 18, 20, 24px. Fixed sizes: rail 56, top strip 52 (Tenang) / 44 + 36 (Ringkas), status bar 26, inspector 284, settings nav 150, day panel 236, table row 29 (Ringkas) / 34 (reminders), toggles 32×18 (Tenang) and 26×15 (Ringkas dense rows).

## Assets
- `public/icon-32.png`, `public/icon-128.png` — the app's own icons, copied from the repo. No new artwork was created.
- Icons are the existing `src/components/Icons.tsx` set (Feather-style, 24 viewBox, `stroke-width:2`, round caps): Clock, MapPin, Calendar, CheckSquare, ArrowRightLeft, Settings, Info, ChevronLeft/Right, Volume2, plus a search glyph and a power glyph that need adding for the Location search field and the Shutdown reminder type.
- Compass is `QiblaCompass.tsx` unchanged (52 viewBox, needle rotated by the bearing).
- No images or illustrations — nothing to source.

## Notes for implementation
1. Ship the shell split first (`layoutMode` + two shell components wrapping shared page bodies), then the two new page treatments (Tenang Jadwal calendar, Ringkas inspector), then ⌘K.
2. Dark and Sepia versions of both modes are not yet designed — the token mapping above means they should mostly fall out of `[data-theme]`, but the Tenang gold tint, the arc gradient, and the Ringkas hairlines need a visual pass on dark.
3. `1c` (Mihrab — warm paper, Instrument Serif, centred column, floating pill nav) is in the file but **not** selected for build; keep it only as a reference for a possible future "reading" mode.
