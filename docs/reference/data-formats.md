# Original Data File Formats

The legacy Shollu uses two custom file formats. Shollu Modern will migrate both to modern, portable equivalents (JSON / SQLite) at build time. The original parsers below are documented for accurate one-time conversion.

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

**Migration target:** JSON resource files keyed by stable string IDs.
```json
{
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Shurook",
  "prayer.dhuhr": "Zuhr",
  ...
}
```

**Tool needed:** One-time converter Python/Rust script that reads each `.slp`, strips comments, and emits one JSON file per language. Manually map line-number indices to semantic IDs by cross-referencing `Lang.Items[N]` usage in the Pascal source.

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

**Migration target:** SQLite database.

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

**Tool needed:** One-time Rust converter that reads each `.spn`, parses per the layout above, and populates the SQLite DB. Augment cities with IANA timezone via a separate lookup (e.g., the `tz_for_point` Rust crate) and altitude via SRTM/Open-Elevation API where missing.

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

**Migration target:** TOML/JSON in platform-standard locations:
- Windows: `%APPDATA%\SholluModern\settings.toml`
- macOS: `~/Library/Application Support/SholluModern/settings.toml`
- Linux: `~/.config/shollu-modern/settings.toml`

Use Tauri's built-in `tauri-plugin-store` or `dirs` crate + `serde` + `toml` for portable persistence. Provide a one-time import helper that reads the legacy registry hive on Windows and migrates values into the new file.
