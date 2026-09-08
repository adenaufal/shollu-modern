---
name: shollu-modern-design
description: Use this skill to generate well-branded interfaces and assets for Shollu Modern, a community-driven modernization of the Indonesian Islamic prayer-times reminder app Shollu (by Ebta Setiawan, 2004-2012). Built on Tauri 2 + SolidJS + Tailwind v4. Contains design guidelines, color tokens, typography, and UI kit components.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code (SolidJS + Tailwind v4 + TypeScript), depending on the need.

## Quick Reference

**Brand colors:**
- Teal primary: `oklch(0.72 0.17 208)` (--shollu-500 range)
- Gold secondary: `oklch(0.80 0.18 84)` (--gold-400 range)

**Fonts:** Inter Tight (display/headings) · Inter (body/numeric, tabular-nums) · Noto Naskh Arabic (Arabic mode)

**Themes:** `data-theme="light|dark|sepia"` on `<html>` · `data-accent="teal|indigo|emerald|rose|slate"`

**Key files:**
- `colors_and_type.css` — full token system, import in any prototype
- `assets/icon.png` / `assets/icon-128.png` — teal+gold app icon
- `ui_kits/shollu-app/index.html` — interactive app prototype (900×600 desktop)
- `preview/` — individual component cards for reference

**Stack context:** Production code uses SolidJS (not React), Tailwind v4 `@theme` tokens, Tauri 2 commands via `invoke()`. UI kit prototypes use React + Babel for rapid iteration only.

**Attribution rule (non-negotiable):** Any UI that includes an About page or footer MUST credit Ebta Setiawan with a link to ebsoft.web.id.
