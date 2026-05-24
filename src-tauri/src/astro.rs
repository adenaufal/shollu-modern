/// Convert a decimal coordinate (latitude/longitude) to a Degree-Minute-Second (DMS) string
/// Ported from `Shollu.pas:484-497` (DecimalToDMS)
pub fn decimal_to_dms(coord: f64) -> String {
    let xd = coord.abs();

    let d = xd.floor() as i32;
    let rem_d = xd - (d as f64);

    let m_float = rem_d * 60.0;
    let m = m_float.floor() as i32;
    let rem_m = m_float - (m as f64);

    let mut s = (rem_m * 60.0).round() as i32;
    let mut m = m;
    let mut d = d;

    // Handle rounding overflow (e.g. 60s -> 1m, 60m -> 1d)
    if s >= 60 {
        s -= 60;
        m += 1;
    }
    if m >= 60 {
        m -= 60;
        d += 1;
    }

    format!("{}°{}'{}\"", d, m, s)
}

/// Format latitude to DMS string with hemisphere suffix (N/S)
/// Ported from `Shollu.pas:499-505` (Lat2DMS)
pub fn lat_to_dms(latitude: f64) -> String {
    if latitude >= 0.0 {
        format!("{}N", decimal_to_dms(latitude))
    } else {
        format!("{}S", decimal_to_dms(latitude))
    }
}

/// Format longitude to DMS string with hemisphere suffix (E/W)
/// Ported from `Shollu.pas:507-513` (Long2DMS)
pub fn lon_to_dms(longitude: f64) -> String {
    if longitude >= 0.0 {
        format!("{}E", decimal_to_dms(longitude))
    } else {
        format!("{}W", decimal_to_dms(longitude))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decimal_to_dms() {
        let res = decimal_to_dms(101.43779);
        assert_eq!(res, "101°26'16\"");
    }

    #[test]
    fn test_lat_to_dms() {
        let res = lat_to_dms(0.506567);
        assert_eq!(res, "0°30'24\"N");
        
        let res_s = lat_to_dms(-6.2088);
        assert_eq!(res_s, "6°12'32\"S");
    }

    #[test]
    fn test_lon_to_dms() {
        let res = lon_to_dms(106.8456);
        assert_eq!(res, "106°50'44\"E");
        
        let res_w = lon_to_dms(-39.823333);
        assert_eq!(res_w, "39°49'24\"W");
    }
}
