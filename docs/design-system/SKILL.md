---
name: shollu-modern-design
description: Use this skill to generate interfaces and assets consistent with the current Shollu Modern v1 UI, a modernization of Shollu by Ebta Setiawan (2004-2012). Built on Tauri 2 + SolidJS + Tailwind v4. This folder also contains archival prototype references.
user-invocable: true
---

Read this folder's README.md, then inspect the current production styles in `src/App.css`, `src/shell.css`, `src/components/prayer-pages.css`, and `src/components/utility-pages.css`. Treat preview pages and `ui_kits/shollu-app/` as historical proposal material, not runtime authority.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), create static HTML files for the user to view. For production UI work, follow the current Tenang and Ringkas layouts, current CSS tokens, and bundled offline fonts in the app source.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code (SolidJS + Tailwind v4 + TypeScript), depending on the need.

## Quick Reference

**Current interface:** Tenang and Ringkas layouts; seven pages plus optional Floating Bar and Drop Zone windows. Default window 960×660, minimum 600×480.

**Themes and accents:** light, dark, sepia; teal, indigo, emerald, rose, slate. Read exact values from `src/App.css`.

**Bundled offline fonts:** Inter, Inter Tight, JetBrains Mono. Read actual roles and tokens from `src/App.css`.

**Key files:**
- `../../src/App.css` — production design tokens and themes
- `../../src/shell.css`, `../../src/components/prayer-pages.css`, `../../src/components/utility-pages.css` — current shell and page styles
- `ui_kits/shollu-app/index.html` and `preview/` — archival proposal prototypes; verify any pattern against production code

**Stack context:** Production code uses SolidJS, Tailwind v4, and Tauri 2 commands via `invoke()`. The older UI kit uses React + Babel and static demo data; it is not current runtime behavior.

**Attribution rule (non-negotiable):** Any UI that includes an About page or footer MUST credit Ebta Setiawan with a link to ebsoft.web.id.
