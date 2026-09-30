use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// Write beside the destination and replace it only after a complete flush.
pub(crate) fn write_atomic(path: &Path, contents: &[u8]) -> Result<(), String> {
    let sequence = TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid settings path")?;
    let temp = path.with_file_name(format!(".{}.{}.{}.tmp", name, std::process::id(), sequence));
    let result = (|| -> Result<(), String> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|e| {
                format!(
                    "Could not create temporary file '{}': {}",
                    temp.display(),
                    e
                )
            })?;
        file.write_all(contents)
            .map_err(|e| format!("Could not write temporary file '{}': {}", temp.display(), e))?;
        file.sync_all()
            .map_err(|e| format!("Could not sync temporary file '{}': {}", temp.display(), e))?;
        drop(file);
        std::fs::rename(&temp, path)
            .map_err(|e| format!("Could not replace '{}': {}", path.display(), e))
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temp);
    }
    result
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct LocationSettings {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: f64,
    pub timezone: f64,
}

impl Default for LocationSettings {
    fn default() -> Self {
        Self {
            name: "Pekanbaru".to_string(),
            latitude: 0.506567,
            longitude: 101.43779,
            altitude: 12.0,
            timezone: 7.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Adjustments {
    pub fajr: i32,
    pub sunrise: i32,
    pub dhuhr: i32,
    pub asr: i32,
    pub maghrib: i32,
    pub isha: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AdzanPrayers {
    pub fajr: bool,
    pub dhuhr: bool,
    pub asr: bool,
    pub maghrib: bool,
    pub isha: bool,
}

impl Default for AdzanPrayers {
    fn default() -> Self {
        Self {
            fajr: true,
            dhuhr: true,
            asr: true,
            maghrib: true,
            isha: true,
        }
    }
}

impl AdzanPrayers {
    pub fn enabled(&self, prayer: &str) -> bool {
        match prayer {
            "Fajr" => self.fajr,
            "Dhuhr" => self.dhuhr,
            "Asr" => self.asr,
            "Maghrib" => self.maghrib,
            "Isha" => self.isha,
            _ => false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub location: LocationSettings,
    pub method: i32, // 1 to 5, default 2 (ISNA)
    pub madhab: i32, // 1 = Shafii/Maliki/Hanbali, 2 = Hanafi, default 1
    pub adjustments: Adjustments,
    pub pembulatan: i8,            // 0 = floor, 1 = ceil, 2 = normal, default 0
    pub language: String,          // default "Indonesia"
    pub skin: String,              // default "default"
    pub adzan_sound_enabled: bool, // default true
    pub adzan_prayers: AdzanPrayers,
    pub adzan_file_path: String, // default ""
    pub always_on_top: bool,     // default false
    pub autostart: bool,         // default false
    #[serde(default)]
    pub floating_bar_visible: bool, // default false
    #[serde(default)]
    pub drop_zone_visible: bool, // default false
    #[serde(default = "default_layout_mode")]
    pub layout_mode: String,
    #[serde(default)]
    pub hijri_adjustment: i8,
}

fn default_layout_mode() -> String {
    "tenang".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            location: LocationSettings::default(),
            method: 2, // ISNA
            madhab: 1, // Shafii
            adjustments: Adjustments::default(),
            pembulatan: 0,
            language: "Indonesia".to_string(),
            skin: "default".to_string(),
            adzan_sound_enabled: true,
            adzan_prayers: AdzanPrayers::default(),
            adzan_file_path: "".to_string(),
            always_on_top: false,
            autostart: false,
            floating_bar_visible: false,
            drop_zone_visible: false,
            layout_mode: default_layout_mode(),
            hijri_adjustment: 0,
        }
    }
}

/// Fetch the platform-specific settings file path
pub fn get_settings_path() -> PathBuf {
    if let Some(path) = std::env::var_os("SHOLLU_CONFIG_DIR").filter(|value| !value.is_empty()) {
        return PathBuf::from(path).join("settings.toml");
    }
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("SholluModern");
    path.push("settings.toml");
    path
}

/// Load settings from TOML file, fall back to defaults
pub fn load_settings() -> AppSettings {
    let path = get_settings_path();
    if !path.exists() {
        return AppSettings::default();
    }

    let mut file = match File::open(&path) {
        Ok(f) => f,
        Err(error) => {
            eprintln!(
                "Failed to read settings '{}': {}; using defaults",
                path.display(),
                error
            );
            return AppSettings::default();
        }
    };

    let mut contents = String::new();
    if let Err(error) = file.read_to_string(&mut contents) {
        eprintln!(
            "Failed to read settings '{}': {}; using defaults",
            path.display(),
            error
        );
        return AppSettings::default();
    }

    let loaded: AppSettings = match toml::from_str(&contents) {
        Ok(settings) => settings,
        Err(error) => {
            eprintln!(
                "Failed to parse settings '{}': {}; using defaults",
                path.display(),
                error
            );
            return AppSettings::default();
        }
    };
    if let Err(error) = validate_settings(&loaded) {
        eprintln!(
            "Invalid settings '{}': {}; using defaults",
            path.display(),
            error
        );
        AppSettings::default()
    } else {
        loaded
    }
}

/// Save settings to TOML file
pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    validate_settings(settings)?;
    let path = get_settings_path();

    // Create directories if they do not exist
    if let Some(parent) = path.parent() {
        create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create settings directory '{}': {}",
                parent.display(),
                e
            )
        })?;
    }

    let toml_string = toml::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    write_atomic(&path, toml_string.as_bytes())
}

/// Reject invalid settings before they reach the calculation or window APIs.
pub fn validate_settings(settings: &AppSettings) -> Result<(), String> {
    let location = &settings.location;
    if location.name.trim().is_empty() {
        return Err("Location name cannot be empty".to_string());
    }
    if !location.latitude.is_finite() || !(-90.0..=90.0).contains(&location.latitude) {
        return Err("Latitude must be a finite value between -90 and 90".to_string());
    }
    if !location.longitude.is_finite() || !(-180.0..=180.0).contains(&location.longitude) {
        return Err("Longitude must be a finite value between -180 and 180".to_string());
    }
    if !location.altitude.is_finite() || !(-500.0..=10000.0).contains(&location.altitude) {
        return Err("Altitude must be a finite value between -500 and 10000 meters".to_string());
    }
    if !location.timezone.is_finite() || !(-12.0..=14.0).contains(&location.timezone) {
        return Err("Timezone must be a finite UTC offset between -12 and 14".to_string());
    }
    if !(1..=6).contains(&settings.method) {
        return Err("Calculation method must be between 1 and 6".to_string());
    }
    if !(1..=2).contains(&settings.madhab) {
        return Err("Madhab must be 1 or 2".to_string());
    }
    if !(0..=2).contains(&settings.pembulatan) {
        return Err("Pembulatan must be 0, 1, or 2".to_string());
    }
    if settings.layout_mode != "tenang" && settings.layout_mode != "ringkas" {
        return Err("Layout mode must be 'tenang' or 'ringkas'".to_string());
    }
    if settings.language.trim().is_empty() {
        return Err("Language cannot be empty".to_string());
    }
    for (name, minutes) in [
        ("Fajr", settings.adjustments.fajr),
        ("sunrise", settings.adjustments.sunrise),
        ("Dhuhr", settings.adjustments.dhuhr),
        ("Asr", settings.adjustments.asr),
        ("Maghrib", settings.adjustments.maghrib),
        ("Isha", settings.adjustments.isha),
    ] {
        if !(-180..=180).contains(&minutes) {
            return Err(format!(
                "{} adjustment must be between -180 and 180 minutes",
                name
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_and_save_settings() {
        // Create custom settings
        let mut settings = AppSettings::default();
        settings.location.name = "Jakarta".to_string();
        settings.location.latitude = -6.2088;
        settings.location.longitude = 106.8456;
        settings.location.timezone = 7.0;
        settings.method = 4; // Umm Al Qura
        settings.adjustments.fajr = 2;

        let temp_dir = std::env::temp_dir();
        let test_path = temp_dir.join("shollu_test_settings.toml");

        // Save
        let toml_string = toml::to_string_pretty(&settings).unwrap();
        let mut file = File::create(&test_path).unwrap();
        file.write_all(toml_string.as_bytes()).unwrap();

        // Load
        let mut file = File::open(&test_path).unwrap();
        let mut contents = String::new();
        file.read_to_string(&mut contents).unwrap();
        let loaded: AppSettings = toml::from_str(&contents).unwrap();

        assert_eq!(loaded.location.name, "Jakarta");
        assert_eq!(loaded.location.latitude, -6.2088);
        assert_eq!(loaded.method, 4);
        assert_eq!(loaded.adjustments.fajr, 2);

        let _ = std::fs::remove_file(&test_path);
    }

    #[test]
    fn older_settings_get_new_defaults() {
        let old = r#"
            method = 2
            madhab = 1
            pembulatan = 0
            language = "Indonesia"
            skin = "default"
            adzan_sound_enabled = true
            adzan_file_path = ""
            always_on_top = false
            autostart = false
            [location]
            name = "Jakarta"
            latitude = -6.2
            longitude = 106.8
            altitude = 8.0
            timezone = 7.0
            [adjustments]
            fajr = 0
            sunrise = 0
            dhuhr = 0
            asr = 0
            maghrib = 0
            isha = 0
        "#;
        let settings: AppSettings = toml::from_str(old).unwrap();
        assert_eq!(settings.location.name, "Jakarta");
        assert_eq!(settings.layout_mode, "tenang");
        assert_eq!(settings.hijri_adjustment, 0);
        assert!(!settings.floating_bar_visible);
        assert!(settings.adzan_prayers.fajr);
    }

    #[test]
    fn rejects_non_finite_and_out_of_range_coordinates() {
        let mut settings = AppSettings::default();
        settings.location.latitude = f64::NAN;
        assert!(validate_settings(&settings).is_err());
        settings.location.latitude = 91.0;
        assert!(validate_settings(&settings).is_err());
        settings.location.latitude = 0.0;
        assert!(validate_settings(&settings).is_ok());
    }

    #[test]
    fn atomic_write_replaces_existing_file() {
        let path = std::env::temp_dir().join(format!("shollu-atomic-{}.txt", std::process::id()));
        std::fs::write(&path, "old").unwrap();
        write_atomic(&path, b"new").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"new");
        std::fs::remove_file(path).unwrap();
    }
}
