# Attribution

## Original Work

**Shollu Modern** is a community-driven modernization of **Shollu**, the prayer times reminder for Muslims worldwide originally created by:

**Ebta Setiawan**
Website: <https://ebsoft.web.id>
Original project page: <https://code.google.com/archive/p/shollu>
GitHub mirror: <https://github.com/ebta/shollu>
Email: ebta.setiawan@gmail.com

Shollu was actively developed from **2004 to 2012**, reaching version 3.10. It was built in Delphi using the KOL (Key Objects Library) and MCK (Mirror Components Kit), producing a remarkably compact ~276 KB Windows executable. The original program was distributed as freeware and, starting from version 3.09, as open source software.

This modernization project exists to revive and preserve Shollu's features for contemporary platforms (Windows + macOS + Linux) with a modern user interface, while honoring the original work and respecting its non-commercial license.

## Original License

The Shollu original distribution states (verbatim, see [docs/original-license.txt](docs/original-license.txt) for the English text):

> Permission is granted to anyone to use, copy, distribute this software in any form freely **except for commercial purpose**, subject to the following restrictions:
>
> 1. The origin of this software must not be misrepresented;
> 2. You must not claim that you wrote the software.
> 3. This notice may not be removed or altered from any distribution.

The **Bahasa Indonesia version of the in-app license** (visible in Shollu3 v3.10's About → Indonesia tab) is more explicit about permitting derivative works:

> Izin diberikan secara gratis kepada siapa saja yang menggunakan program, copy, menyebarkan, menyertakan dalam download di web site, CD atau media lainnya. **Bagi yang ingin mengembangkannya kami persilahkan**, dengan tetap memperhatikan etika dan cara yang baik. Untuk informasi lebih lengkap silahkan langsung email ke ebta.setiawan@gmail.com atau kunjungi http://ebsoft.web.id dan juga https://code.google.com/p/shollu/

Translation: "Permission is granted freely to anyone to use the program, copy it, distribute it, include it in website/CD/other media downloads. **For those who wish to develop it, we welcome it**, while maintaining ethics and good manners…"

Both texts together clearly authorize the kind of non-commercial derivative work Shollu Modern represents. The non-commercial constraint and attribution requirements remain in force for any portion derived from the original.

## New Project License

Shollu Modern is licensed under **PolyForm Noncommercial 1.0.0** ([LICENSE.md](LICENSE.md)), which is functionally compatible with the original Shollu license:

- Both prohibit commercial use
- Both allow free use, copying, modification, and redistribution for noncommercial purposes
- Both require preserving the license notice

PolyForm Noncommercial was chosen because it is a modern, SPDX-recognized license written specifically for non-commercial source code, with clear, enforceable legal text. The original Shollu license terms continue to apply to any portions derived from the original work.

## What Carries Over from the Original

The following elements of Shollu Modern derive from or are inspired by the original Shollu and remain subject to its license:

- Prayer time calculation algorithms (5 methods: ISNA, Karachi, World Islamic League, Umul Qura, Egypt General Org) — astronomical formulas are public-domain mathematics, but the specific implementation patterns and calibration constants trace to the original `Shollu.pas`
- Qibla direction calculation
- Hijri ↔ Masehi calendar conversion
- The "Shollu" name itself, used here with attribution and clear "Modern" suffix to signal community continuation rather than official authorship by Ebta Setiawan
- Concept, feature set, and user experience design

## What Is New in Shollu Modern

- All code is a fresh implementation in Rust (backend, via Tauri 2) and TypeScript/SolidJS (frontend)
- Modern UI using Tailwind CSS, designed for current accessibility and platform conventions
- Cross-platform support (Windows, macOS, Linux) — the original was Windows-only
- Updated city/timezone databases
- All audio, icon, and visual assets are either freshly created, sourced from the original under its license, or sourced from compatible noncommercial sources (documented inline)

## Trademark Note

"Shollu" is used here in good faith as a community continuation. It is not a registered trademark to our knowledge. If Ebta Setiawan or any rightful holder objects to the use of the "Shollu" name, Shollu Modern will rebrand promptly.

## Contact

For questions about attribution, licensing, or to claim original-author rights, please open an issue on the Shollu Modern repository or contact the maintainers.
