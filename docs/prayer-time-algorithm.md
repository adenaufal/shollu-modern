# Prayer Time Calculation — Algorithm Reference

Source: `Shollu.pas` lines 408-472 (function `GetPrayerTime`) in the original Shollu by Ebta Setiawan.

This document describes the algorithm as implemented in Shollu, transcribed for the Shollu Modern Rust port. The formulas are based on **Spencer's Fourier expansions** for solar declination and the equation of time (Spencer, 1971), combined with standard spherical-trigonometry hour-angle computation for sunrise/sunset and the Islamic juristic methods for Fajr, Asr, Maghrib, and Isha.

## Inputs

| Parameter | Pascal type | Description |
|---|---|---|
| `date` | TDateTime | Calendar date (year, month, day) |
| `altitude` | Integer (m) | Observer elevation above sea level |
| `tz_hours` | Single | Timezone offset in hours from UTC (e.g., +7 for WIB) |
| `fajr_angle` | Single (°) | Fajr depression angle (see methods table) |
| `isha_angle` | Single (°) | Isha depression angle (see methods table) |
| `latitude` | Single (°) | Observer latitude, positive N |
| `longitude` | Single (°) | Observer longitude, positive E |
| `madhab_shafii` | Boolean | `true` = Shafi'i (Sh=1), `false` = Hanafi (Sh=2). Affects Asr only. |

## Calculation methods (Gd / Gn constants)

| Method | Const ID | Fajr (Gd) | Isha (Gn) | Source |
|---|---|---|---|---|
| Universitas Islamic Science Karachi | 1 | 18° | 18° | UArea.pas:269 |
| Islamic Society of North America (ISNA) | 2 | 15° | 15° | UArea.pas:274 |
| World Islamic League (MWL) | 3 | 18° | 17° | UArea.pas:279 |
| Universitas Umul Qura | 4 | 19° | 18° | UArea.pas:284 |
| Egypt General Org Survey | 5 | 19.5° | 17.5° | UArea.pas:289 |
| Custom | 6+ | user-supplied | user-supplied | UArea.pas:292+ |

**Note on Umul Qura:** Shollu uses 19°/18°. The modern standard for Umul Qura is 18.5° for Fajr and "90 minutes after Maghrib" for Isha. Shollu Modern preserves Shollu's values to maintain output parity. A modern-mode toggle may be added later.

## Adjustments

After base calculation, each prayer time gets an optional minute offset (`Add_Shubuh`, `Add_Dhuhur`, `Add_Asar`, `Add_Maghrib`, `Add_Isya`) for fine-tuning per locale.

## Algorithm

### 1. Day-of-year angular position
```
B_t = (2 * π * day_of_year) / 365
```

### 2. Solar declination (Spencer 1971)
```
D = (180/π) * (
        0.006918
      - 0.399912 * cos(B_t)
      + 0.070257 * sin(B_t)
      - 0.006758 * cos(2 * B_t)
      + 0.000907 * sin(2 * B_t)
      - 0.002697 * cos(3 * B_t)
      + 0.001480 * sin(3 * B_t)
    )
```
Output in degrees.

### 3. Equation of time (Spencer 1971)
```
T = 229.18 * (
        0.000075
      + 0.001868 * cos(B_t)
      - 0.032077 * sin(B_t)
      - 0.014615 * cos(2 * B_t)
      - 0.040849 * sin(2 * B_t)
    )
```
Output in minutes.

### 4. Reference meridian
```
R = 15 * tz_hours
```
The reference longitude for the timezone, in degrees.

### 5. Solar noon (Dhuhur, in hours)
```
Z = 12 + (R - longitude) / 15 - T / 60
```

### 6. Sunrise/sunset hour angle
```
U = (180 / (15 * π)) * arccos(
        (sin((-0.8333 - 0.0347 * sign(H) * sqrt(|H|)) * π / 180)
         - sin(D * π / 180) * sin(latitude * π / 180))
      / (cos(D * π / 180) * cos(latitude * π / 180))
    )
```
where `H = altitude`. The `-0.8333` is atmospheric refraction (50') plus solar disk radius (16'); the altitude-correction term lowers the apparent horizon for elevated observers.

### 7. Fajr hour angle
```
V_d = (180 / (15 * π)) * arccos(
        (-sin(fajr_angle * π / 180) - sin(D * π / 180) * sin(latitude * π / 180))
      / (cos(D * π / 180) * cos(latitude * π / 180))
      )
```

### 8. Isha hour angle
Identical formula to Fajr but using `isha_angle` instead of `fajr_angle`.

### 9. Asr hour angle (Shafi'i / Hanafi)
```
W = (180 / (15 * π)) * arccos(
        (sin(arctan2(1 / (Sh + tan(|latitude - D| * π / 180)), 1))
         - sin(D * π / 180) * sin(latitude * π / 180))
      / (cos(D * π / 180) * cos(latitude * π / 180))
    )
```
where `Sh = 1` for Shafi'i, `Sh = 2` for Hanafi. The inner `arctan2(1/(Sh + tan(|lat - decl|)), 1)` computes the altitude angle when the shadow of a vertical object equals `Sh` object-heights plus the noon shadow.

### 10. Output times (hours past local midnight)
```
shubuh   = Z - V_d  + Add_Shubuh  / 60
terbit   = Z - U
dhuhur   = Z        + Add_Dhuhur  / 60
asar     = Z + W    + Add_Asar    / 60
maghrib  = Z + U    + Add_Maghrib / 60
isya     = Z + V_n  + Add_Isya    / 60
```

## Rounding modes (from `Pembulatan` setting)

When formatting to `HH:mm` (no seconds):
- **0** (down): truncate seconds — `HH:mm` is the floor minute
- **1** (up): always add one minute — `HH:mm` is ceil minute
- **2** (nearest): if seconds ≥ 30, add one minute; else truncate

## Edge cases to handle in port

1. **High latitudes** where the sun does not set or does not reach the Fajr/Isha depression angle — `arccos` argument exceeds [-1, 1]. The original Shollu does not handle this; it produces NaN or garbage. **Shollu Modern should detect and use a documented fallback** (e.g., "Angle-based" interpolation, "One-seventh of night", or "Middle of night" methods).

2. **Negative altitude** (below sea level) — `sign(H) * sqrt(|H|)` correctly handles this; preserved as-is.

3. **Polar/extreme latitudes** combined with extreme declinations may cause `U`, `V_d`, `V_n`, or `W` to be undefined.

## References

- Spencer, J. W. (1971). "Fourier series representation of the position of the sun." *Search* 2(5), 172.
- Reda, I., & Andreas, A. (2004). "Solar position algorithm for solar radiation applications." *Solar Energy* 76(5), 577-589.
- Tantawi, Abdulrahman. (2007). "Prayer Times Calculation: Methods and Mathematics." Various university lecture notes; multiple open-source implementations.
