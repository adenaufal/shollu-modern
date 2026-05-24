mod prayer_times;
mod hijri;
mod qibla;
mod astro;
mod places;
mod i18n;
mod settings;
mod scheduler;
mod audio;

use chrono::{Datelike, Local, NaiveDate};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

// Shared path helpers
fn get_app_paths(app: &tauri::AppHandle) -> (PathBuf, PathBuf, PathBuf) {
    let app_dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = std::fs::create_dir_all(&app_dir);
    let db_path = app_dir.join("cities.db");

    let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("."));

    // SPN Directory resolution
    let mut spn_dir = resource_dir.join("placenames");
    if !spn_dir.exists() {
        spn_dir = PathBuf::from("placenames");
    }
    if !spn_dir.exists() {
        spn_dir = PathBuf::from("src-tauri/placenames");
    }

    // Languages Directory resolution
    let mut lang_dir = resource_dir.join("Languages");
    if !lang_dir.exists() {
        lang_dir = PathBuf::from("Languages");
    }
    if !lang_dir.exists() {
        lang_dir = PathBuf::from("src-tauri/Languages");
    }

    (db_path, spn_dir, lang_dir)
}

// ==========================================
// Tauri Commands
// ==========================================

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn compute_prayer_times(
    date_iso: String, // "YYYY-MM-DD"
    latitude: f64,
    longitude: f64,
    altitude: f64,
    timezone: f64,
    method_id: i32,
    madhab_id: i32,
    fajr_angle: Option<f64>,
    isha_angle: Option<f64>,
    adjustments: prayer_times::Adjustments,
) -> Result<prayer_times::PrayerTimes, String> {
    let date = NaiveDate::parse_from_str(&date_iso, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;

    let day_of_year = date.ordinal() as u16;

    let location = prayer_times::Location {
        latitude,
        longitude,
        altitude: altitude as i32,
        tz_hours: timezone,
    };

    let method = match method_id {
        1 => prayer_times::Method::Karachi,
        2 => prayer_times::Method::Isna,
        3 => prayer_times::Method::Mwl,
        4 => prayer_times::Method::UmmAlQura,
        5 => prayer_times::Method::Egypt,
        6 => prayer_times::Method::Custom {
            fajr_angle: fajr_angle.unwrap_or(15.0),
            isha_angle: isha_angle.unwrap_or(15.0),
        },
        _ => prayer_times::Method::Isna,
    };

    let madhab = match madhab_id {
        1 => prayer_times::Madhab::Shafii,
        2 => prayer_times::Madhab::Hanafi,
        _ => prayer_times::Madhab::Shafii,
    };

    Ok(prayer_times::compute(
        day_of_year,
        location,
        method,
        madhab,
        adjustments,
    ))
}

#[tauri::command]
fn convert_gregorian_to_hijri(
    year: i32,
    month: u32,
    day: u32,
    adjustment: i8,
) -> hijri::DateResult {
    hijri::gregorian_to_hijri(year, month, day, adjustment)
}

#[tauri::command]
fn convert_hijri_to_gregorian(
    year: i32,
    month: u32,
    day: u32,
    adjustment: i8,
) -> hijri::DateResult {
    hijri::hijri_to_gregorian(year, month, day, adjustment)
}

#[tauri::command]
fn qibla_bearing(latitude: f64, longitude: f64) -> qibla::QiblaResult {
    qibla::calculate_qibla(latitude, longitude)
}

#[tauri::command]
fn format_lat_dms(latitude: f64) -> String {
    astro::lat_to_dms(latitude)
}

#[tauri::command]
fn format_lon_dms(longitude: f64) -> String {
    astro::lon_to_dms(longitude)
}

#[tauri::command]
fn search_cities(app: tauri::AppHandle, query: String, limit: usize) -> Result<Vec<places::City>, String> {
    let (db_path, _, _) = get_app_paths(&app);
    places::search_cities(&db_path, &query, limit)
}

#[tauri::command]
fn list_regions(app: tauri::AppHandle) -> Result<Vec<places::Region>, String> {
    let (db_path, _, _) = get_app_paths(&app);
    places::list_regions(&db_path)
}

#[tauri::command]
fn cities_by_region(app: tauri::AppHandle, region_id: i32) -> Result<Vec<places::City>, String> {
    let (db_path, _, _) = get_app_paths(&app);
    places::cities_by_region(&db_path, region_id)
}

#[tauri::command]
fn get_languages(app: tauri::AppHandle) -> Result<Vec<i18n::LanguageMeta>, String> {
    let (_, _, lang_dir) = get_app_paths(&app);
    i18n::list_languages(&lang_dir)
}

#[tauri::command]
fn get_translations(app: tauri::AppHandle, lang_id: String) -> Result<HashMap<String, String>, String> {
    let (_, _, lang_dir) = get_app_paths(&app);
    i18n::get_translations(&lang_dir, &lang_id)
}

#[tauri::command]
fn get_settings() -> settings::AppSettings {
    settings::load_settings()
}

#[tauri::command]
fn save_settings(settings: settings::AppSettings) -> Result<(), String> {
    settings::save_settings(&settings)
}

#[tauri::command]
fn list_tasks() -> Vec<scheduler::ScheduledTask> {
    scheduler::load_tasks()
}

#[tauri::command]
fn save_tasks(tasks: Vec<scheduler::ScheduledTask>) -> Result<(), String> {
    scheduler::save_tasks(&tasks)
}

#[tauri::command]
fn play_adzan(file_path: String) -> Result<(), String> {
    audio::play_audio(&file_path)
}

#[tauri::command]
fn stop_audio() {
    audio::stop_audio();
}

#[tauri::command]
fn set_volume(volume: f32) {
    audio::set_volume(volume);
}

#[tauri::command]
fn toggle_floating_bar(app: tauri::AppHandle, show: bool) -> Result<(), String> {
    if show {
        if let Some(win) = app.get_webview_window("floating-bar") {
            let _ = win.show();
            let _ = win.set_focus();
        } else {
            let _win = tauri::WebviewWindowBuilder::new(
                &app,
                "floating-bar",
                tauri::WebviewUrl::App("index.html".into())
            )
            .title("Shollu Floating Bar")
            .inner_size(800.0, 40.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .build()
            .map_err(|e| e.to_string())?;
        }
    } else {
        if let Some(win) = app.get_webview_window("floating-bar") {
            let _ = win.hide();
        }
    }
    Ok(())
}

#[tauri::command]
fn toggle_drop_zone(app: tauri::AppHandle, show: bool) -> Result<(), String> {
    if show {
        if let Some(win) = app.get_webview_window("drop-zone") {
            let _ = win.show();
            let _ = win.set_focus();
        } else {
            let _win = tauri::WebviewWindowBuilder::new(
                &app,
                "drop-zone",
                tauri::WebviewUrl::App("index.html".into())
            )
            .title("Shollu Drop Zone")
            .inner_size(180.0, 48.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .build()
            .map_err(|e| e.to_string())?;
        }
    } else {
        if let Some(win) = app.get_webview_window("drop-zone") {
            let _ = win.hide();
        }
    }
    Ok(())
}

// ==========================================
// App Startup Registration
// ==========================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // DB and places setup
            let (db_path, spn_dir, _) = get_app_paths(app.handle());
            let _ = places::init_db(&db_path, &spn_dir);

            // Active Loop for scheduled tasks (runs once a second)
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
                loop {
                    interval.tick().await;

                    let now = Local::now();
                    let tasks = scheduler::load_tasks();
                    for task in tasks {
                        if scheduler::is_task_due(&task, now) {
                            // Execute OS commands, Shutdown/Hibernate actions
                            scheduler::execute_task_action(&task);

                            // Play multimedia adzan if required
                            if task.task_type == "Multimedia" {
                                if let Some(ref path) = task.file_path {
                                    let _ = audio::play_audio(path);
                                }
                            }

                            // Emit tauri event to frontend to display the Information/Warning alerts
                            let _ = app_handle.emit("trigger-task", task);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compute_prayer_times,
            convert_gregorian_to_hijri,
            convert_hijri_to_gregorian,
            qibla_bearing,
            format_lat_dms,
            format_lon_dms,
            search_cities,
            list_regions,
            cities_by_region,
            get_languages,
            get_translations,
            get_settings,
            save_settings,
            list_tasks,
            save_tasks,
            play_adzan,
            stop_audio,
            set_volume,
            toggle_floating_bar,
            toggle_drop_zone
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
