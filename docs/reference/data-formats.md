# Original Data File Formats

The original Shollu uses two custom file formats. The formats below describe the source files as observed in the legacy data and Pascal reader; they are historical format references, not a statement that Shollu Modern converts them to JSON/SQLite. The current app bundles the original `.slp` language packs and `.spn` place-name files as Tauri resources. Rust loads language resources and imports place records into its local SQLite database at runtime.

## `.slp` — Language Pack (Plain Text)

**Encoding:** ASCII / Windows-1252 (single-byte). Confirmed by inspecting `English.slp`, `Indonesia.slp`, etc.

**Format:** Newline-delimited records with comment lines.

```
;; ===================================== ;;
;; Shollu Language Pack for Shollu v3.06 ;;
;; LangName      : English               ;;
;; Created by    : Ebta Setiawan         ;;
;; Last Modified : 8:40 09/12/2006       ;;
;; ===================================== ;;

;; Do not directly edit this file, but always save as or created backup copy
Shollu3
;; ========== General ========== ;;

; Prayer times names
Fajr
Shurook
Zuhr
Asr
Maghrib
Isha
...
```

**Rules:**
- Lines starting with `;` or `;;` are comments — skip when parsing.
- Empty lines are ignored.
- Non-comment, non-empty lines are values, indexed sequentially: line N → `Lang.Items[N]`.
- The first non-comment line `Shollu3` appears to be a magic identifier — not counted as item zero, but treat conservatively.
- Code references like `Lang.Items[150]`, `Lang.Items[202]`, etc. throughout `Unit1.pas` map to specific indices defined by position in the language file.

**Original proposal (not the current runtime format):** JSON resource files keyed by stable string IDs.
```json
{
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Shurook",
  "prayer.dhuhr": "Zuhr",
  ...
}
```

The current runtime reads bundled `.slp` files through the Rust i18n module and exposes the selected language to the UI. No build-time JSON conversion is required by the current app.

## `.spn` — Place Names (Binary)

**Encoding:** Little-endian, ASCII strings, length-prefixed (Pascal short string style).

**File layout:**

```
[0xEB 0x00]                       ← 2-byte magic marker
[12 bytes ASCII "Shollu v3.xx"]   ← Version string
[u16 AdmCnt]                      ← Number of administrative regions
                                    (provinces/states/countries)

For each region (AdmCnt times):
  [0xFA]                          ← Region separator
  [u8 admNameLen]
  [admNameLen bytes ASCII]        ← Region name (e.g., "Jawa Barat")

  For each city in the region:
    [u8 cityNameLen]              ← (cityNameLen > 0 and != 0xFA)
    [cityNameLen bytes ASCII]     ← City name
    [f32 latitude]                ← IEEE-754 32-bit float, degrees
    [f32 longitude]               ← IEEE-754 32-bit float, degrees
  Until next 0xFA byte or EOF.
```

**Source reference:** `UCities.pas:147-237` (`LoadFirst` + `LoadAdmName`).

**Bundled files:**
- `Indonesia.spn` (~2.3 MB) — Indonesian provinces + cities (approx. 400 cities)
- `Cities.spn` — World major cities (approx. 2,341 entries)
- `ID.SPN` — Alternative Indonesia dataset

**Current implementation:** Rust parses the bundled `.spn` files and initializes a local SQLite database for place search. The schema and import behavior live in `src-tauri/src/places.rs`; they are authoritative for the runtime database. The schema below is an earlier suggested shape, not the current schema.

```sql
CREATE TABLE regions (
  id INTEGER PRIMARY KEY,
  country_code TEXT,        -- ISO 3166-1 alpha-2 (e.g., "ID")
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES regions(id)  -- province under country
);

CREATE TABLE cities (
  id INTEGER PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude INTEGER,         -- meters; original .spn has no altitude
  timezone TEXT             -- IANA TZ name; original uses numeric offset
);

CREATE INDEX cities_region_idx ON cities (region_id);
CREATE INDEX cities_name_idx ON cities (name COLLATE NOCASE);
```

The source `.spn` data contains region and city names plus latitude/longitude; timezone and altitude remain user-configurable location settings rather than being inferred from an external lookup.

## Settings persistence

The original Shollu stores user settings in the **Windows Registry** at:
```
HKEY_LOCAL_MACHINE\Software\Shollu3
```

Keys observed in `Unit1.pas:1183-1195` and `UArea.pas:217+`:
- `Area`, `Latitude`, `Longitude`, `Altitude`
- `TZ`, `Methods`, `Syafii`, `Gn`, `Gd`
- `Add_Dhuhur`, `Add_Maghrib`, `Add_Shubuh`, `Add_Asar`, `Add_Isya`
- `Adzan` (file path), `AlwaysOnTop`, plus several skin/effect/UI prefs

**Original proposal (not current storage):** TOML/JSON in platform-standard locations:
- Windows: `%APPDATA%\SholluModern\settings.toml`
- macOS: `~/Library/Application Support/SholluModern/settings.toml`
- Linux: `~/.config/shollu-modern/settings.toml`

The current app persists settings as TOML in `settings.toml` under `dirs::config_dir()/SholluModern` (or the directory selected by `SHOLLU_CONFIG_DIR`) through the Rust settings module. It does not use `tauri-plugin-store` or import the legacy Windows registry. See `src-tauri/src/settings.rs` for the current settings structure and persistence behavior.
