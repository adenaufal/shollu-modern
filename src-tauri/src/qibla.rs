/// Qibla result structure containing bearing in degrees and cardinal direction
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QiblaResult {
    pub degrees: f64,
    pub cardinal: String,
}

/// Calculate Qibla bearing and direction from latitude and longitude
/// Ported from `UMainPage.pas:179-188` (QiblaAngle)
pub fn calculate_qibla(latitude: f64, longitude: f64) -> QiblaResult {
    const MLONG: f64 = 39.823333; // Mecca longitude
    const MLAT: f64 = 21.42333; // Mecca latitude

    // Convert to radians
    let lat_rad = latitude * std::f64::consts::PI / 180.0;
    let mlat_rad = MLAT * std::f64::consts::PI / 180.0;
    let diff_lon_rad = (-longitude + MLONG) * std::f64::consts::PI / 180.0;

    let x1 = diff_lon_rad.sin();
    let y1 = lat_rad.cos() * mlat_rad.tan();
    let y2 = lat_rad.sin() * diff_lon_rad.cos();

    // atan(x1 / (y1 - y2)) in degrees
    let mut degrees = (x1 / (y1 - y2)).atan() * 180.0 / std::f64::consts::PI;

    if degrees < 0.0 {
        degrees += 360.0;
    }

    // West or East from Mecca, the limit is MLONG - 180
    // Original Pascal: if (Lon < MLONG) and (Lon > (MLONG-180)) then if Angle > 180 then Angle := Angle - 180;
    if longitude < MLONG && longitude > (MLONG - 180.0) && degrees > 180.0 {
        degrees -= 180.0;
    }

    if degrees > 360.0 {
        degrees -= 360.0;
    }

    // Round to 2 decimal places for user friendliness
    let rounded_degrees = (degrees * 100.0).round() / 100.0;

    // Map to cardinal direction
    let directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW",
        "NW", "NNW",
    ];
    let index = (((degrees + 11.25) / 22.5).floor() as usize) % 16;
    let cardinal = directions[index].to_string();

    QiblaResult {
        degrees: rounded_degrees,
        cardinal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_qibla_pekanbaru() {
        // Reference: Pekanbaru (latitude: 0.506567, longitude: 101.43779) -> Qibla should be ~293.81° (WNW)
        let res = calculate_qibla(0.506567, 101.43779);
        assert!((res.degrees - 293.81).abs() < 0.1);
        assert_eq!(res.cardinal, "WNW");
    }

    #[test]
    fn test_calculate_qibla_jakarta() {
        // Reference: Jakarta (latitude: -6.2088, longitude: 106.8456)
        let res = calculate_qibla(-6.2088, 106.8456);
        assert!((res.degrees - 295.12).abs() < 0.1);
        assert_eq!(res.cardinal, "WNW");
    }
}
