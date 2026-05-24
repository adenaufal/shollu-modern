use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File};
use std::io::{Read, Write};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationSettings {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub altitude: f64,
    pub timezone: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Adjustments {
    pub fajr: i32,
    pub sunrise: i32,
    pub dhuhr: i32,
    pub asr: i32,
    pub maghrib: i32,
    pub isha: i32,
}

impl Default for Adjustments {
    fn default() -> Self {
        Self {
            fajr: 0,
            sunrise: 0,
            dhuhr: 0,
            asr: 0,
            maghrib: 0,
            isha: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub location: LocationSettings,
    pub method: i32, // 1 to 5, default 2 (ISNA)
    pub madhab: i32, // 1 = Shafii/Maliki/Hanbali, 2 = Hanafi, default 1
    pub adjustments: Adjustments,
    pub pembulatan: i8, // 0 = floor, 1 = ceil, 2 = normal, default 0
    pub language: String, // default "Indonesia"
    pub skin: String, // default "default"
    pub adzan_sound_enabled: bool, // default true
    pub adzan_file_path: String, // default ""
    pub always_on_top: bool, // default false
    pub autostart: bool, // default false
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            location: LocationSettings {
                name: "Pekanbaru".to_string(),
                latitude: 0.506567,
                longitude: 101.43779,
                altitude: 12.0,
                timezone: 7.0,
            },
            method: 2, // ISNA
            madhab: 1, // Shafii
            adjustments: Adjustments::default(),
            pembulatan: 0,
            language: "Indonesia".to_string(),
            skin: "default".to_string(),
            adzan_sound_enabled: true,
            adzan_file_path: "".to_string(),
            always_on_top: false,
            autostart: false,
        }
    }
}

/// Fetch the platform-specific settings file path
pub fn get_settings_path() -> PathBuf {
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
        Err(_) => return AppSettings::default(),
    };

    let mut contents = String::new();
    if file.read_to_string(&mut contents).is_err() {
        return AppSettings::default();
    }

    toml::from_str(&contents).unwrap_or_else(|_| AppSettings::default())
}

/// Save settings to TOML file
pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    
    // Create directories if they do not exist
    if let Some(parent) = path.parent() {
        create_dir_all(parent).map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }

    let toml_string = toml::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    let mut file = File::create(&path)
        .map_err(|e| format!("Failed to create settings file: {}", e))?;

    file.write_all(toml_string.as_bytes())
        .map_err(|e| format!("Failed to write settings: {}", e))?;

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
}
