/// Qibla result structure containing bearing in degrees and cardinal direction
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QiblaResult {
    pub degrees: f64,
    pub cardinal: String,
}

/// Calculate Qibla bearing and direction from latitude and longitude
/// Ported from `UMainPage.pas:179-188` (QiblaAngle)
pub fn calculate_qibla(latitude: f64, longitude: f64) -> Result<QiblaResult, String> {
    if !latitude.is_finite() || !(-90.0..=90.0).contains(&latitude) {
        return Err("Latitude must be a finite value between -90 and 90".to_string());
    }
    if !longitude.is_finite() || !(-180.0..=180.0).contains(&longitude) {
        return Err("Longitude must be a finite value between -180 and 180".to_string());
    }
    // Ka'bah (Masjid al-Haram) coordinates, WGS84.
    // Higher precision than the original Shollu.pas values (21.42333, 39.823333)
    // to keep the bearing computation consistent with the surveyed Ka'bah
    // location. The bearing delta vs. the original is <0.001° in practice.
    const MLAT: f64 = 21.4225243; // Ka'bah latitude
    const MLONG: f64 = 39.8261817; // Ka'bah longitude

    // Convert to radians
    let lat_rad = latitude * std::f64::consts::PI / 180.0;
    let mlat_rad = MLAT * std::f64::consts::PI / 180.0;
    let diff_lon_rad = (MLONG - longitude).to_radians();

    // The original Pascal atan(quotient) loses the southward quadrant. atan2
    // keeps the correct great-circle bearing in every hemisphere.
    let east = mlat_rad.cos() * diff_lon_rad.sin();
    let north =
        lat_rad.cos() * mlat_rad.sin() - lat_rad.sin() * mlat_rad.cos() * diff_lon_rad.cos();
    if east.abs() < 1e-12 && north.abs() < 1e-12 {
        return Err("Qibla bearing is undefined at these coordinates".to_string());
    }
    let degrees = east.atan2(north).to_degrees().rem_euclid(360.0);

    // Round to 2 decimal places for user friendliness
    let rounded_degrees = (degrees * 100.0).round() / 100.0;

    // Map to cardinal direction
    let directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW",
        "NW", "NNW",
    ];
    let index = (((degrees + 11.25) / 22.5).floor() as usize) % 16;
    let cardinal = directions.get(index).copied().unwrap_or("N").to_string();

    if !rounded_degrees.is_finite() {
        return Err("Unable to calculate Qibla bearing for these coordinates".to_string());
    }
    Ok(QiblaResult {
        degrees: rounded_degrees,
        cardinal,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_qibla_pekanbaru() {
        // Reference: Pekanbaru (latitude: 0.506567, longitude: 101.43779) -> Qibla should be ~293.81° (WNW)
        let res = calculate_qibla(0.506567, 101.43779).unwrap();
        assert!((res.degrees - 293.81).abs() < 0.1);
        assert_eq!(res.cardinal, "WNW");
    }

    #[test]
    fn test_calculate_qibla_jakarta() {
        // Reference: Jakarta (latitude: -6.2088, longitude: 106.8456)
        let res = calculate_qibla(-6.2088, 106.8456).unwrap();
        assert!((res.degrees - 295.12).abs() < 0.1);
        assert_eq!(res.cardinal, "WNW");
    }

    #[test]
    fn test_calculate_qibla_invalid_coordinates_no_panic() {
        assert!(calculate_qibla(f64::NAN, f64::INFINITY).is_err());
    }

    #[test]
    fn rejects_invalid_coordinates() {
        assert!(calculate_qibla(f64::NAN, 0.0).is_err());
        assert!(calculate_qibla(0.0, 181.0).is_err());
    }

    #[test]
    fn qibla_bearing_uses_southern_quadrant() {
        let north_of_mecca = calculate_qibla(40.0, 39.8261817).unwrap();
        assert_eq!(north_of_mecca.degrees, 180.0);
        assert_eq!(north_of_mecca.cardinal, "S");
        let east_of_mecca = calculate_qibla(21.4225243, 60.0).unwrap();
        assert!(east_of_mecca.degrees > 260.0 && east_of_mecca.degrees < 280.0);
        assert!(calculate_qibla(21.4225243, 39.8261817).is_err());
    }
}
