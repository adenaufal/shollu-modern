// Prayer time calculation — Rust port of Shollu.pas:408-472 (GetPrayerTime).
//
// Algorithm: Spencer (1971) Fourier expansions for solar declination and the
// equation of time, combined with standard spherical-trigonometry hour-angle
// computation for sunrise/sunset and the Islamic juristic methods for Fajr,
// Asr, Maghrib, and Isha.
//
// Originally implemented by Ebta Setiawan in Shollu (2004-2012). Re-implemented
// here for Shollu Modern under the project's non-commercial license. See
// docs/original-license.txt at the repository root for the original Shollu
// license terms.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct PrayerTimes {
    pub fajr: f64,
    pub sunrise: f64,
    pub dhuhr: f64,
    pub asr: f64,
    pub maghrib: f64,
    pub isha: f64,
}

impl PrayerTimes {
    pub fn to_hms(hours: f64) -> (u8, u8, u8) {
        let h = hours.floor() as u8;
        let m = ((hours - h as f64) * 60.0).floor() as u8;
        let s = ((((hours - h as f64) * 60.0) - m as f64) * 60.0).floor() as u8;
        (h, m, s)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Madhab {
    Shafii,
    Hanafi,
}

impl Madhab {
    fn shadow_factor(self) -> f64 {
        match self {
            Madhab::Shafii => 1.0,
            Madhab::Hanafi => 2.0,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Method {
    Karachi,
    Isna,
    Mwl,
    UmmAlQura,
    Egypt,
    Custom { fajr_angle: f64, isha_angle: f64 },
}

impl Method {
    fn angles(self) -> (f64, f64) {
        match self {
            Method::Karachi => (18.0, 18.0),
            Method::Isna => (15.0, 15.0),
            Method::Mwl => (18.0, 17.0),
            Method::UmmAlQura => (19.0, 18.0),
            Method::Egypt => (19.5, 17.5),
            Method::Custom { fajr_angle, isha_angle } => (fajr_angle, isha_angle),
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct Adjustments {
    pub fajr: i32,
    pub sunrise: i32,
    pub dhuhr: i32,
    pub asr: i32,
    pub maghrib: i32,
    pub isha: i32,
}

#[derive(Debug, Clone, Copy)]
pub struct Location {
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: i32,
    pub tz_hours: f64,
}

pub fn compute(
    day_of_year: u16,
    location: Location,
    method: Method,
    madhab: Madhab,
    adjustments: Adjustments,
) -> PrayerTimes {
    let (fajr_angle, isha_angle) = method.angles();
    let sh = madhab.shadow_factor();

    let b = location.latitude;
    let l = location.longitude;
    let tz = location.tz_hours;
    let h = location.altitude as f64;

    let bt = (2.0 * PI * day_of_year as f64) / 365.0;

    let d = (180.0 / PI)
        * (0.006918
            - 0.399912 * bt.cos()
            + 0.070257 * bt.sin()
            - 0.006758 * (2.0 * bt).cos()
            + 0.000907 * (2.0 * bt).sin()
            - 0.002697 * (3.0 * bt).cos()
            + 0.001480 * (3.0 * bt).sin());

    let t = 229.18
        * (0.000075
            + 0.001868 * bt.cos()
            - 0.032077 * bt.sin()
            - 0.014615 * (2.0 * bt).cos()
            - 0.040849 * (2.0 * bt).sin());

    let r = 15.0 * tz;
    let z = 12.0 + (r - l) / 15.0 - t / 60.0;

    let d_rad = d.to_radians();
    let b_rad = b.to_radians();

    let altitude_term = (-0.8333 - 0.0347 * h.signum() * h.abs().sqrt()).to_radians();
    let u = (180.0 / (15.0 * PI))
        * ((altitude_term.sin() - d_rad.sin() * b_rad.sin()) / (d_rad.cos() * b_rad.cos())).acos();

    let v_d = (180.0 / (15.0 * PI))
        * ((-fajr_angle.to_radians().sin() - d_rad.sin() * b_rad.sin())
            / (d_rad.cos() * b_rad.cos()))
        .acos();

    let v_n = (180.0 / (15.0 * PI))
        * ((-isha_angle.to_radians().sin() - d_rad.sin() * b_rad.sin())
            / (d_rad.cos() * b_rad.cos()))
        .acos();

    let asr_altitude = (1.0 / (sh + ((b - d).abs().to_radians()).tan())).atan();
    let w = (180.0 / (15.0 * PI))
        * ((asr_altitude.sin() - d_rad.sin() * b_rad.sin()) / (d_rad.cos() * b_rad.cos())).acos();

    const ONE_MINUTE_AS_HOURS: f64 = 1.0 / 60.0;
    PrayerTimes {
        fajr: z - v_d + adjustments.fajr as f64 * ONE_MINUTE_AS_HOURS,
        sunrise: z - u + adjustments.sunrise as f64 * ONE_MINUTE_AS_HOURS,
        dhuhr: z + adjustments.dhuhr as f64 * ONE_MINUTE_AS_HOURS,
        asr: z + w + adjustments.asr as f64 * ONE_MINUTE_AS_HOURS,
        maghrib: z + u + adjustments.maghrib as f64 * ONE_MINUTE_AS_HOURS,
        isha: z + v_n + adjustments.isha as f64 * ONE_MINUTE_AS_HOURS,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordering_jakarta_isna_shafii_january_first() {
        let times = compute(
            1,
            Location {
                latitude: -6.2088,
                longitude: 106.8456,
                altitude: 7,
                tz_hours: 7.0,
            },
            Method::Isna,
            Madhab::Shafii,
            Adjustments::default(),
        );
        assert!(times.fajr < times.sunrise);
        assert!(times.sunrise < times.dhuhr);
        assert!(times.dhuhr < times.asr);
        assert!(times.asr < times.maghrib);
        assert!(times.maghrib < times.isha);
    }

    #[test]
    fn ordering_mecca_umm_al_qura_shafii_june() {
        let times = compute(
            172,
            Location {
                latitude: 21.4225,
                longitude: 39.8262,
                altitude: 277,
                tz_hours: 3.0,
            },
            Method::UmmAlQura,
            Madhab::Shafii,
            Adjustments::default(),
        );
        assert!(times.fajr < times.sunrise);
        assert!(times.sunrise < times.dhuhr);
        assert!(times.dhuhr < times.asr);
        assert!(times.asr < times.maghrib);
        assert!(times.maghrib < times.isha);
    }

    #[test]
    fn hms_basic() {
        let (h, m, _s) = PrayerTimes::to_hms(5.5);
        assert_eq!(h, 5);
        assert_eq!(m, 30);
    }

    fn fmt(hours: f64) -> String {
        let (h, m, s) = PrayerTimes::to_hms(hours);
        format!("{:02}:{:02}:{:02}", h, m, s)
    }

    #[test]
    fn validate_pekanbaru_against_shollu3() {
        // Reference: Shollu3.exe v3.10 screenshot, Pekanbaru, May 20 2026.
        // Location settings copied verbatim from Shollu3 settings panel:
        //   Lat 0.53333, Lon 101.449, Alt 0, TZ +7
        //   Madhab: Shafii
        //   Method: Custom (Gd=19.5, Gn=17.5)  — same angles as Egypt method
        //   Adjustments: Dhuhur +5, Maghrib +3, others 0
        let t = compute(
            140, // 31+28+31+30+20 = 140 (May 20, 2026 non-leap year)
            Location {
                latitude: 0.53333,
                longitude: 101.449,
                altitude: 0,
                tz_hours: 7.0,
            },
            Method::Custom { fajr_angle: 19.5, isha_angle: 17.5 },
            Madhab::Shafii,
            Adjustments { fajr: 0, dhuhr: 5, asr: 0, maghrib: 3, isha: 0 },
        );

        // Shollu3.exe displayed values (HH:mm:ss, Pembulatan=Kebawah):
        let expected: [(&str, &str, f64); 6] = [
            ("Shubuh",  "04:46:27", t.fajr),
            ("Terbit",  "06:06:06", t.sunrise),
            ("Dhuhur",  "12:15:24", t.dhuhr),
            ("Asar",    "15:34:23", t.asr),
            ("Maghrib", "18:17:43", t.maghrib),
            ("Isya",    "19:25:47", t.isha),
        ];

        println!();
        println!("Pekanbaru May 20 2026  Custom(19.5/17.5) Shafii  Dhuhur+5 Maghrib+3");
        println!("{:<10} {:<10} {:<10} {:>10}", "Prayer", "Shollu3", "Rust", "Delta (s)");
        println!("{}", "-".repeat(45));

        let mut max_delta_sec: f64 = 0.0;
        for (name, shollu, hours) in expected {
            let (h, m, s) = PrayerTimes::to_hms(hours);
            let rust_str = format!("{:02}:{:02}:{:02}", h, m, s);

            // Parse Shollu3 string to seconds since midnight
            let parts: Vec<u32> = shollu.split(':').map(|p| p.parse().unwrap()).collect();
            let shollu_sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            let rust_sec = (hours * 3600.0) as i64;
            let delta = rust_sec - shollu_sec as i64;

            println!(
                "{:<10} {:<10} {:<10} {:>10}",
                name, shollu, rust_str, delta
            );
            max_delta_sec = max_delta_sec.max((delta as f64).abs());
        }
        println!();
        println!("Max delta: {} seconds", max_delta_sec as i64);
        assert!(
            max_delta_sec <= 60.0,
            "Rust port differs from Shollu3 by more than 1 minute somewhere"
        );
    }

    #[test]
    fn print_reference_table() {
        #[allow(clippy::type_complexity)]
        let cases: &[(&str, u16, f64, f64, i32, f64, Method, Madhab)] = &[
            ("Jakarta  May 20 (doy=140)  ISNA Shafii", 140, -6.2088, 106.8456, 7, 7.0, Method::Isna, Madhab::Shafii),
            ("Mecca    May 20 (doy=140)  UmmAlQura Shafii", 140, 21.4225, 39.8262, 277, 3.0, Method::UmmAlQura, Madhab::Shafii),
            ("Jakarta  Jan  1 (doy=001)  ISNA Shafii", 1, -6.2088, 106.8456, 7, 7.0, Method::Isna, Madhab::Shafii),
            ("Jakarta  Jun 21 (doy=172)  ISNA Shafii", 172, -6.2088, 106.8456, 7, 7.0, Method::Isna, Madhab::Shafii),
            ("Jakarta  Dec 21 (doy=355)  ISNA Shafii", 355, -6.2088, 106.8456, 7, 7.0, Method::Isna, Madhab::Shafii),
            ("Jakarta  May 20 (doy=140)  MWL Shafii ", 140, -6.2088, 106.8456, 7, 7.0, Method::Mwl, Madhab::Shafii),
            ("Jakarta  May 20 (doy=140)  Karachi Shafii", 140, -6.2088, 106.8456, 7, 7.0, Method::Karachi, Madhab::Shafii),
            ("Jakarta  May 20 (doy=140)  Egypt Shafii", 140, -6.2088, 106.8456, 7, 7.0, Method::Egypt, Madhab::Shafii),
            ("Jakarta  May 20 (doy=140)  ISNA Hanafi", 140, -6.2088, 106.8456, 7, 7.0, Method::Isna, Madhab::Hanafi),
        ];

        println!();
        println!("{:<45}  Fajr     Sunrise  Dhuhr    Asr      Maghrib  Isha", "Case");
        println!("{}", "-".repeat(45 + 6 * 9));
        for (label, doy, lat, lon, alt, tz, method, madhab) in cases {
            let t = compute(
                *doy,
                Location { latitude: *lat, longitude: *lon, altitude: *alt, tz_hours: *tz },
                *method,
                *madhab,
                Adjustments::default(),
            );
            println!(
                "{:<45}  {}  {}  {}  {}  {}  {}",
                label,
                fmt(t.fajr),
                fmt(t.sunrise),
                fmt(t.dhuhr),
                fmt(t.asr),
                fmt(t.maghrib),
                fmt(t.isha),
            );
        }
        println!();
    }
}
