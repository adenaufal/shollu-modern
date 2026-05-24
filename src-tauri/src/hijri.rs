/// Date structure for Gregorian and Hijri dates
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DateResult {
    pub year: i32,
    pub month: u32,
    pub day: u32,
    pub weekday: u32, // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
}

/// Convert Gregorian date to Hijri date
/// Ported from `Shollu.pas:301-379` (ConvertDate)
pub fn gregorian_to_hijri(year: i32, month: u32, day: u32, adjustment: i8) -> DateResult {
    let y2 = year;
    let m2 = month as i32;
    // Apply HijriyahDiff adjustment to the day
    let d2 = (day as i32) + (adjustment as i32);

    // Calculate Julian Day (jd)
    let jd = if (y2 > 1582) || (y2 == 1582 && m2 > 10) || (y2 == 1582 && m2 == 10 && d2 > 14) {
        ((1461 * (y2 + 4800 + (m2 - 14) / 12)) / 4)
            + ((367 * (m2 - 2 - 12 * ((m2 - 14) / 12))) / 12)
            - ((3 * ((y2 + 4900 + (m2 - 14) / 12) / 100)) / 4)
            + d2
            - 32075
    } else {
        367 * y2 - ((7 * (y2 + 5001 + (m2 - 9) / 7)) / 4)
            + ((275 * m2) / 9)
            + d2
            + 1729777
    };

    // Calculate Hijri date from Julian Day
    let l = jd - 1948440 + 10632;
    let n = (l - 1) / 10631;
    let l_rem = l - 10631 * n + 354;
    
    let j = ((10985 - l_rem) / 5316) * ((50 * l_rem) / 17719)
        + (l_rem / 5670) * ((43 * l_rem) / 15238);
        
    let l_final = l_rem
        - ((30 - j) / 15) * ((17719 * j) / 50)
        - (j / 16) * ((15238 * j) / 43)
        + 29;
        
    let rm = (24 * l_final) / 709;
    let rd = l_final - (709 * rm) / 24;
    let ry = 30 * n + j - 30;

    // Weekday calculation: jd % 7 gives 0 = Monday, 1 = Tuesday, ..., 5 = Saturday, 6 = Sunday.
    // Map to 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    let weekday_map = [2, 3, 4, 5, 6, 7, 1]; // 0 (Mon)->2, 1 (Tue)->3, ..., 5 (Sat)->7, 6 (Sun)->1
    let weekday = weekday_map[(jd % 7).unsigned_abs() as usize];

    DateResult {
        year: ry,
        month: rm as u32,
        day: rd as u32,
        weekday: weekday as u32,
    }
}

/// Convert Hijri date to Gregorian date
/// Ported from `Shollu.pas:301-379` (ConvertDate)
pub fn hijri_to_gregorian(year: i32, month: u32, day: u32, adjustment: i8) -> DateResult {
    let y2 = year;
    let m2 = month as i32;
    let d2 = (day as i32) + (adjustment as i32);

    // Calculate Julian Day (jd) from Hijri date
    let jd = ((11 * y2 + 3) / 30) + 354 * y2 + 30 * m2 - (m2 - 1) / 2 + d2 + 1948440 - 385;

    // Calculate Gregorian date from Julian Day
    let (ry, rm, rd) = if jd > 2299160 {
        let l = jd + 68569;
        let n = (4 * l) / 146097;
        let l2 = l - (146097 * n + 3) / 4;
        let i = (4000 * (l2 + 1)) / 1461001;
        let l3 = l2 - (1461 * i) / 4 + 31;
        let j = (80 * l3) / 2447;
        let rd = l3 - (2447 * j) / 80;
        let l4 = j / 11;
        let rm = j + 2 - 12 * l4;
        let ry = 100 * (n - 49) + i + l4;
        (ry, rm, rd)
    } else {
        let j = jd + 1402;
        let k = (j - 1) / 1461;
        let l = j - 1461 * k;
        let n = (l - 1) / 365 - l / 1461;
        let i = l - 365 * n + 30;
        let j2 = (80 * i) / 2447;
        let rd = i - (2447 * j2) / 80;
        let i2 = j2 / 11;
        let rm = j2 + 2 - 12 * i2;
        let ry = 4 * k + n + i2 - 4716;
        (ry, rm, rd)
    };

    // Weekday calculation: jd % 7 gives 0 = Monday, 1 = Tuesday, ..., 5 = Saturday, 6 = Sunday.
    // Map to 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    let weekday_map = [2, 3, 4, 5, 6, 7, 1];
    let weekday = weekday_map[(jd % 7).unsigned_abs() as usize];

    DateResult {
        year: ry,
        month: rm as u32,
        day: rd as u32,
        weekday: weekday as u32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gregorian_to_hijri() {
        // Reference: 20 May 2026 -> 3 Dzulhijjah 1447 H (weekday should be Wednesday -> 4)
        let res = gregorian_to_hijri(2026, 5, 20, 0);
        assert_eq!(res.year, 1447);
        assert_eq!(res.month, 12); // Dzulhijjah
        assert_eq!(res.day, 3);
        assert_eq!(res.weekday, 4); // Wednesday
    }

    #[test]
    fn test_hijri_to_gregorian() {
        // Reference: 3 Dzulhijjah 1447 H -> 20 May 2026 (weekday should be Wednesday -> 4)
        let res = hijri_to_gregorian(1447, 12, 3, 0);
        assert_eq!(res.year, 2026);
        assert_eq!(res.month, 5); // May
        assert_eq!(res.day, 20);
        assert_eq!(res.weekday, 4); // Wednesday
    }
}
