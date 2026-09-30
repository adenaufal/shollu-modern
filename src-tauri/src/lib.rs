mod astro;
mod audio;
mod hijri;
mod i18n;
mod places;
mod prayer_times;
mod qibla;
mod scheduler;
mod settings;

use chrono::{Datelike, Local, NaiveDate, Timelike};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_notification::NotificationExt;

const FLOATING_BAR_WEBVIEW_URL: &str = "index.html?window=floating-bar";
const DROP_ZONE_WEBVIEW_URL: &str = "index.html?window=drop-zone";
static SETTINGS_TRANSACTION_LOCK: Mutex<()> = Mutex::new(());

// Shared path helpers
fn get_app_paths(app: &tauri::AppHandle) -> (PathBuf, PathBuf, PathBuf) {
    let app_dir = std::env::var_os("SHOLLU_CONFIG_DIR")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            app.path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
        });
    let _ = std::fs::create_dir_all(&app_dir);
    let db_path = app_dir.join("cities.db");

    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

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
    pembulatan: Option<i8>,
) -> Result<prayer_times::PrayerTimes, String> {
    let date = NaiveDate::parse_from_str(&date_iso, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;

    let day_of_year = date.ordinal() as u16;

    if !latitude.is_finite() || !(-90.0..=90.0).contains(&latitude) {
        return Err("Latitude must be finite and between -90 and 90".into());
    }
    if !longitude.is_finite() || !(-180.0..=180.0).contains(&longitude) {
        return Err("Longitude must be finite and between -180 and 180".into());
    }
    if !altitude.is_finite() || !(-500.0..=10000.0).contains(&altitude) {
        return Err("Altitude must be finite and between -500 and 10000 meters".into());
    }
    if !timezone.is_finite() || !(-12.0..=14.0).contains(&timezone) {
        return Err("Timezone must be a finite UTC offset between -12 and 14".into());
    }
    if let Some(mode) = pembulatan {
        if !(0..=2).contains(&mode) {
            return Err("Pembulatan must be 0, 1, or 2".into());
        }
    }
    if [
        adjustments.fajr,
        adjustments.sunrise,
        adjustments.dhuhr,
        adjustments.asr,
        adjustments.maghrib,
        adjustments.isha,
    ]
    .iter()
    .any(|minutes| !(-180..=180).contains(minutes))
    {
        return Err("Prayer time adjustments must be between -180 and 180 minutes".into());
    }

    let location = prayer_times::Location {
        latitude,
        longitude,
        altitude,
        tz_hours: timezone,
    };

    let method = match method_id {
        1 => prayer_times::Method::Karachi,
        2 => prayer_times::Method::Isna,
        3 => prayer_times::Method::Mwl,
        4 => prayer_times::Method::UmmAlQura,
        5 => prayer_times::Method::Egypt,
        6 => {
            let fajr = fajr_angle.unwrap_or(15.0);
            let isha = isha_angle.unwrap_or(15.0);
            if !fajr.is_finite()
                || !(0.0..=30.0).contains(&fajr)
                || !isha.is_finite()
                || !(0.0..=30.0).contains(&isha)
            {
                return Err(
                    "Custom Fajr and Isha angles must be finite values between 0 and 30 degrees"
                        .into(),
                );
            }
            prayer_times::Method::Custom {
                fajr_angle: fajr,
                isha_angle: isha,
            }
        }
        _ => return Err("Unknown prayer calculation method".into()),
    };

    let madhab = match madhab_id {
        1 => prayer_times::Madhab::Shafii,
        2 => prayer_times::Madhab::Hanafi,
        _ => return Err("Unknown madhab".into()),
    };

    let mut times = prayer_times::compute(day_of_year, location, method, madhab, adjustments);
    let rounding = pembulatan.unwrap_or_else(|| settings::load_settings().pembulatan);
    if ![
        times.fajr,
        times.sunrise,
        times.dhuhr,
        times.asr,
        times.maghrib,
        times.isha,
    ]
    .iter()
    .all(|v| v.is_finite())
    {
        return Err("Prayer time calculation produced a non-finite result".into());
    }
    for time in [
        &mut times.fajr,
        &mut times.sunrise,
        &mut times.dhuhr,
        &mut times.asr,
        &mut times.maghrib,
        &mut times.isha,
    ] {
        *time = round_prayer_time(*time, rounding);
    }
    Ok(times)
}

fn round_prayer_time(hours: f64, rounding: i8) -> f64 {
    let minutes = hours * 60.0;
    let rounded = match rounding {
        1 => minutes.ceil(),
        2 => minutes.round(),
        _ => minutes.floor(),
    };
    rounded.rem_euclid(1440.0) / 60.0
}

#[tauri::command]
fn convert_gregorian_to_hijri(
    year: i32,
    month: u32,
    day: u32,
    adjustment: Option<i8>,
) -> Result<hijri::DateResult, String> {
    if !(1..=9999).contains(&year) {
        return Err("Gregorian year must be between 1 and 9999".into());
    }
    let date = NaiveDate::from_ymd_opt(year, month, day)
        .ok_or_else(|| "Invalid Gregorian date".to_string())?;
    let adjustment = adjustment.unwrap_or_else(|| settings::load_settings().hijri_adjustment);
    let adjusted = date
        .checked_add_signed(chrono::Duration::days(i64::from(adjustment)))
        .ok_or_else(|| "Date adjustment is outside supported range".to_string())?;
    Ok(hijri::gregorian_to_hijri(
        adjusted.year(),
        adjusted.month(),
        adjusted.day(),
        0,
    ))
}

#[tauri::command]
fn convert_hijri_to_gregorian(
    year: i32,
    month: u32,
    day: u32,
    adjustment: Option<i8>,
) -> Result<hijri::DateResult, String> {
    if !(1..=12).contains(&month) || !(1..=30).contains(&day) || !(1..=9999).contains(&year) {
        return Err("Invalid Hijri date".into());
    }
    let adjustment = adjustment.unwrap_or_else(|| settings::load_settings().hijri_adjustment);
    let result = hijri::hijri_to_gregorian(year, month, day, 0);
    let date = NaiveDate::from_ymd_opt(result.year, result.month, result.day)
        .ok_or_else(|| "Hijri date conversion produced an invalid date".to_string())?;
    let check = hijri::gregorian_to_hijri(result.year, result.month, result.day, 0);
    if check.year != year || check.month != month || check.day != day {
        return Err("Invalid Hijri day for the selected month".into());
    }
    let adjusted = date
        .checked_sub_signed(chrono::Duration::days(i64::from(adjustment)))
        .ok_or_else(|| "Date adjustment is outside supported range".to_string())?;
    Ok(hijri::DateResult {
        year: adjusted.year(),
        month: adjusted.month(),
        day: adjusted.day(),
        weekday: hijri::gregorian_to_hijri(adjusted.year(), adjusted.month(), adjusted.day(), 0)
            .weekday,
    })
}

#[tauri::command]
fn qibla_bearing(latitude: f64, longitude: f64) -> Result<qibla::QiblaResult, String> {
    qibla::calculate_qibla(latitude, longitude)
}

#[tauri::command]
fn format_lat_dms(latitude: f64) -> Result<String, String> {
    if !latitude.is_finite() || !(-90.0..=90.0).contains(&latitude) {
        return Err("Latitude must be finite and between -90 and 90".into());
    }
    Ok(astro::lat_to_dms(latitude))
}

#[tauri::command]
fn format_lon_dms(longitude: f64) -> Result<String, String> {
    if !longitude.is_finite() || !(-180.0..=180.0).contains(&longitude) {
        return Err("Longitude must be finite and between -180 and 180".into());
    }
    Ok(astro::lon_to_dms(longitude))
}

#[tauri::command]
fn search_cities(
    app: tauri::AppHandle,
    query: String,
    limit: usize,
) -> Result<Vec<places::City>, String> {
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
fn get_translations(
    app: tauri::AppHandle,
    lang_id: String,
) -> Result<HashMap<String, String>, String> {
    let (_, _, lang_dir) = get_app_paths(&app);
    i18n::get_translations(&lang_dir, &lang_id)
}

#[tauri::command]
fn get_settings() -> settings::AppSettings {
    settings::load_settings()
}

#[tauri::command]
async fn save_settings(
    app: tauri::AppHandle,
    settings: settings::AppSettings,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || save_settings_inner(app, settings))
        .await
        .map_err(|error| format!("Settings worker failed: {}", error))?
}

fn save_settings_inner(
    app: tauri::AppHandle,
    settings: settings::AppSettings,
) -> Result<(), String> {
    let _guard = SETTINGS_TRANSACTION_LOCK
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    save_settings_locked(app, settings)
}

fn save_settings_locked(
    app: tauri::AppHandle,
    mut settings: settings::AppSettings,
) -> Result<(), String> {
    settings::validate_settings(&settings)?;
    if std::env::var_os("SHOLLU_CONFIG_DIR").is_some() && settings.autostart {
        return Err("Startup launch cannot be enabled with SHOLLU_CONFIG_DIR".into());
    }
    if settings.adzan_sound_enabled && settings.adzan_file_path.trim().is_empty() {
        // An empty path means no custom sound is configured; it is a valid silent setting.
        settings.adzan_file_path.clear();
    }
    let previous = settings::load_settings();
    if let Err(error) = apply_runtime_settings(&app, &settings, &previous) {
        let _ = apply_runtime_settings(&app, &previous, &settings);
        return Err(error);
    }
    if let Err(error) = settings::save_settings(&settings) {
        let _ = apply_runtime_settings(&app, &previous, &settings);
        return Err(error);
    }
    let _ = app.emit("settings-changed", settings);
    Ok(())
}

fn apply_runtime_settings(
    app: &tauri::AppHandle,
    settings: &settings::AppSettings,
    previous: &settings::AppSettings,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(settings.always_on_top)
            .map_err(|e| format!("Could not apply always-on-top setting: {}", e))?;
    }
    if settings.autostart != previous.autostart {
        if std::env::var_os("SHOLLU_CONFIG_DIR").is_some() && settings.autostart {
            return Err("Startup launch cannot be enabled with SHOLLU_CONFIG_DIR".into());
        }
        if settings.autostart {
            app.autolaunch()
                .enable()
                .map_err(|e| format!("Could not enable startup launch: {}", e))?;
        } else {
            app.autolaunch()
                .disable()
                .map_err(|e| format!("Could not disable startup launch: {}", e))?;
        }
    }
    sync_overlays(app, settings)
}

#[tauri::command]
fn list_tasks() -> Vec<scheduler::ScheduledTask> {
    scheduler::load_tasks()
}

#[tauri::command]
fn save_tasks(app: tauri::AppHandle, tasks: Vec<scheduler::ScheduledTask>) -> Result<(), String> {
    scheduler::save_tasks(&tasks)?;
    let _ = app.emit("tasks-changed", &tasks);
    Ok(())
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
fn set_volume(volume: f32) -> Result<(), String> {
    if !volume.is_finite() || !(0.0..=1.0).contains(&volume) {
        return Err("Volume must be between 0 and 1".into());
    }
    audio::set_volume(volume);
    Ok(())
}

#[tauri::command]
async fn choose_audio_file(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Audio", &["mp3", "wav", "ogg", "flac"])
        .pick_file(move |file| {
            let _ = tx.send(file);
        });
    rx.await
        .ok()
        .flatten()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn choose_task_file(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_file(move |file| {
        let _ = tx.send(file);
    });
    rx.await
        .ok()
        .flatten()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn save_export_file(
    app: tauri::AppHandle,
    default_name: String,
    content: String,
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    let name = std::path::Path::new(&default_name)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Invalid export filename".to_string())?;
    let extension = std::path::Path::new(name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !["csv", "html", "txt"].contains(&extension.as_str()) {
        return Err("Export format must be CSV, HTML, or TXT".to_string());
    }
    if content.len() > 10_000_000 {
        return Err("Export is too large".to_string());
    }
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(name)
        .add_filter("Export", &[extension.as_str()])
        .save_file(move |file| {
            let _ = tx.send(file);
        });
    let Some(file) = rx
        .await
        .map_err(|_| "Save dialog did not respond".to_string())?
    else {
        return Ok(false);
    };
    let path = file
        .into_path()
        .map_err(|e| format!("Invalid export path: {}", e))?;
    tokio::task::spawn_blocking(move || {
        std::fs::write(&path, content)
            .map_err(|e| format!("Could not save export '{}': {}", path.display(), e))
    })
    .await
    .map_err(|e| format!("Export worker failed: {}", e))??;
    Ok(true)
}

fn overlay_sizes(layout: &str) -> Result<(f64, f64, f64, f64), String> {
    match layout {
        "tenang" => Ok((520.0, 46.0, 132.0, 132.0)),
        "ringkas" => Ok((470.0, 34.0, 152.0, 52.0)),
        _ => Err("Unknown layout mode".to_string()),
    }
}

fn apply_overlay_sizes(
    app: &tauri::AppHandle,
    settings: &settings::AppSettings,
) -> Result<(), String> {
    let (bar_width, bar_height, zone_width, zone_height) = overlay_sizes(&settings.layout_mode)?;
    for (label, width, height) in [
        ("floating-bar", bar_width, bar_height),
        ("drop-zone", zone_width, zone_height),
    ] {
        if let Some(window) = app.get_webview_window(label) {
            window
                .set_size(tauri::LogicalSize::new(width, height))
                .map_err(|e| format!("Could not resize {}: {}", label, e))?;
            window
                .set_always_on_top(settings.always_on_top)
                .map_err(|e| format!("Could not apply always-on-top to {}: {}", label, e))?;
        }
    }
    Ok(())
}

fn sync_overlays(app: &tauri::AppHandle, settings: &settings::AppSettings) -> Result<(), String> {
    apply_overlay_sizes(app, settings)?;
    for (label, visible) in [
        ("floating-bar", settings.floating_bar_visible),
        ("drop-zone", settings.drop_zone_visible),
    ] {
        match app.get_webview_window(label) {
            Some(window) if visible => window
                .show()
                .map_err(|e| format!("Could not show {}: {}", label, e))?,
            Some(window) => window
                .hide()
                .map_err(|e| format!("Could not hide {}: {}", label, e))?,
            None if visible => build_overlay(app, label, settings)?,
            None => {}
        }
    }
    Ok(())
}

fn build_overlay(
    app: &tauri::AppHandle,
    label: &str,
    settings: &settings::AppSettings,
) -> Result<(), String> {
    let (bar_width, bar_height, zone_width, zone_height) = overlay_sizes(&settings.layout_mode)?;
    let (title, url, width, height) = match label {
        "floating-bar" => (
            "Shollu Floating Bar",
            FLOATING_BAR_WEBVIEW_URL,
            bar_width,
            bar_height,
        ),
        "drop-zone" => (
            "Shollu Drop Zone",
            DROP_ZONE_WEBVIEW_URL,
            zone_width,
            zone_height,
        ),
        _ => return Err(format!("Unknown overlay {}", label)),
    };
    tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App(url.into()))
        .title(title)
        .inner_size(width, height)
        .decorations(false)
        .transparent(true)
        .always_on_top(settings.always_on_top)
        .resizable(false)
        .build()
        .map(|_| ())
        .map_err(|e| format!("Could not create {}: {}", label, e))
}

#[tauri::command]
async fn toggle_floating_bar(app: tauri::AppHandle, show: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = SETTINGS_TRANSACTION_LOCK
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let mut settings = settings::load_settings();
        settings.floating_bar_visible = show;
        save_settings_locked(app, settings)
    })
    .await
    .map_err(|error| format!("Floating bar worker failed: {}", error))?
}

#[tauri::command]
async fn toggle_drop_zone(app: tauri::AppHandle, show: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = SETTINGS_TRANSACTION_LOCK
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let mut settings = settings::load_settings();
        settings.drop_zone_visible = show;
        save_settings_locked(app, settings)
    })
    .await
    .map_err(|error| format!("Drop zone worker failed: {}", error))?
}

// ==========================================
// App Startup Registration
// ==========================================

fn install_tray(app: &tauri::AppHandle) -> Result<(), String> {
    let show = MenuItem::with_id(app, "show-main", "Show Shollu Modern", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let hide = MenuItem::with_id(app, "hide-overlays", "Hide windows", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let exit =
        MenuItem::with_id(app, "exit", "Exit", true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(app, &[&show, &hide, &exit]).map_err(|e| e.to_string())?;
    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Shollu Modern")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show-main" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide-overlays" => {
                for label in ["main", "floating-bar", "drop-zone"] {
                    if let Some(window) = app.get_webview_window(label) {
                        let _ = window.hide();
                    }
                }
            }
            "exit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .build(app)
        .map(|_| ())
        .map_err(|e| format!("Could not create system tray: {}", e))
}

fn prayer_method(settings: &settings::AppSettings) -> prayer_times::Method {
    match settings.method {
        1 => prayer_times::Method::Karachi,
        2 => prayer_times::Method::Isna,
        3 => prayer_times::Method::Mwl,
        4 => prayer_times::Method::UmmAlQura,
        5 => prayer_times::Method::Egypt,
        _ => prayer_times::Method::Custom {
            fajr_angle: 15.0,
            isha_angle: 15.0,
        },
    }
}

fn prayer_reminders(settings: &settings::AppSettings, date: NaiveDate) -> Vec<(String, f64)> {
    let times = prayer_times::compute(
        date.ordinal() as u16,
        prayer_times::Location {
            latitude: settings.location.latitude,
            longitude: settings.location.longitude,
            altitude: settings.location.altitude,
            tz_hours: settings.location.timezone,
        },
        prayer_method(settings),
        if settings.madhab == 2 {
            prayer_times::Madhab::Hanafi
        } else {
            prayer_times::Madhab::Shafii
        },
        settings.adjustments.clone().into(),
    );
    [
        ("Fajr", times.fajr),
        ("Dhuhr", times.dhuhr),
        ("Asr", times.asr),
        ("Maghrib", times.maghrib),
        ("Isha", times.isha),
    ]
    .into_iter()
    .map(|(name, hours)| {
        (
            name.to_string(),
            round_prayer_time(hours, settings.pembulatan),
        )
    })
    .collect()
}

impl From<settings::Adjustments> for prayer_times::Adjustments {
    fn from(value: settings::Adjustments) -> Self {
        Self {
            fajr: value.fajr,
            sunrise: value.sunrise,
            dhuhr: value.dhuhr,
            asr: value.asr,
            maghrib: value.maghrib,
            isha: value.isha,
        }
    }
}

fn dispatch_task(app: &tauri::AppHandle, task: scheduler::ScheduledTask) {
    if matches!(
        task.task_type.as_str(),
        "Info" | "Warning" | "MovingText" | "Multimedia"
    ) {
        if let Err(error) = app
            .notification()
            .builder()
            .title(&task.name)
            .body(&task.message)
            .show()
        {
            let _ = app.emit("task-error", serde_json::json!({"taskId": task.id, "message": format!("Could not show reminder notification: {}", error)}));
        }
    }
    if matches!(
        task.task_type.as_str(),
        "Command" | "Shutdown" | "Hibernate"
    ) {
        if let Err(error) = scheduler::execute_task_action(&task) {
            let _ = app.emit(
                "task-error",
                serde_json::json!({"taskId": task.id, "message": error}),
            );
        }
    }
    if task.task_type == "Multimedia" {
        if let Some(path) = task.file_path.as_deref() {
            if let Err(error) = audio::play_audio(path) {
                let _ = app.emit(
                    "task-error",
                    serde_json::json!({"taskId": task.id, "message": error}),
                );
            }
        }
    }
    let _ = app.emit("trigger-task", task);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            // DB and places setup
            let (db_path, spn_dir, _) = get_app_paths(app.handle());
            if let Err(error) = places::init_db(&db_path, &spn_dir) {
                eprintln!(
                    "Failed to initialize places database at {}: {}",
                    db_path.display(),
                    error
                );
            }

            // Restore app settings and overlays from prior runs.
            let restored_settings = settings::load_settings();
            if restored_settings.autostart && std::env::var_os("SHOLLU_CONFIG_DIR").is_none() {
                if let Err(error) = app.autolaunch().enable() {
                    eprintln!("Could not restore startup launch: {}", error);
                }
            }
            if let Some(main) = app.get_webview_window("main") {
                if let Err(error) = main.set_always_on_top(restored_settings.always_on_top) {
                    eprintln!("Could not restore always-on-top: {}", error);
                }
            }
            let overlay_app = app.handle().clone();
            let overlay_settings = restored_settings.clone();
            tauri::async_runtime::spawn_blocking(move || {
                if let Err(error) = sync_overlays(&overlay_app, &overlay_settings) {
                    eprintln!("Could not restore overlay windows: {}", error);
                }
            });
            if let Err(error) = install_tray(app.handle()) {
                eprintln!("{}", error);
            }

            // Start-frequency tasks run once for each application launch.
            for task in scheduler::load_tasks()
                .into_iter()
                .filter(|task| task.enabled && task.frequency == "Start")
            {
                dispatch_task(app.handle(), task);
            }

            // Active Loop for scheduled tasks (runs once a second)
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
                let mut fired_task_keys: HashSet<(String, chrono::NaiveDate, u32, u32)> =
                    HashSet::new();
                let mut fired_prayers: HashSet<(String, NaiveDate)> = HashSet::new();
                loop {
                    interval.tick().await;
                    let settings = settings::load_settings();
                    let offset_seconds = (settings.location.timezone * 3600.0).round() as i64;
                    let prayer_now =
                        chrono::Utc::now().naive_utc() + chrono::Duration::seconds(offset_seconds);
                    let date = prayer_now.date();
                    let hour = prayer_now.hour();
                    let minute = prayer_now.minute();
                    // User-defined tasks follow the computer's local clock;
                    // the selected location offset applies only to prayers.
                    let task_now = Local::now().naive_local();
                    let task_date = task_now.date();
                    let task_hour = task_now.hour();
                    let task_minute = task_now.minute();
                    fired_task_keys.retain(|(_, fired_date, fired_hour, fired_minute)| {
                        *fired_date == task_date
                            && *fired_hour == task_hour
                            && *fired_minute == task_minute
                    });
                    fired_prayers.retain(|(_, fired_date)| *fired_date == date);

                    for (name, prayer_hour) in prayer_reminders(&settings, date) {
                        let total_minutes = (prayer_hour * 60.0).round() as u32;
                        if total_minutes / 60 == hour
                            && total_minutes % 60 == minute
                            && fired_prayers.insert((name.clone(), date))
                        {
                            let sound_path = settings.adzan_file_path.trim();
                            let should_play = settings.adzan_sound_enabled
                                && settings.adzan_prayers.enabled(&name)
                                && !sound_path.is_empty()
                                && std::path::Path::new(sound_path).is_file();
                            if settings.adzan_sound_enabled
                                && settings.adzan_prayers.enabled(&name)
                                && !sound_path.is_empty()
                                && !std::path::Path::new(sound_path).is_file()
                            {
                                let _ = app_handle.emit(
                                    "task-error",
                                    serde_json::json!({"taskId": format!("prayer-{}", name.to_lowercase()), "message": "Configured adhan audio file was not found"}),
                                );
                            }
                            let reminder = scheduler::ScheduledTask {
                                id: format!("prayer-{}-{}", name.to_lowercase(), date),
                                name: format!("{} prayer", name),
                                task_type: if should_play { "Multimedia" } else { "Info" }
                                    .to_string(),
                                frequency: "Daily".to_string(),
                                time: format!("{:02}:{:02}", hour, minute),
                                day_of_week: None,
                                day_of_month: None,
                                month: None,
                                message: format!("It is time for {} prayer", name),
                                file_path: should_play.then(|| sound_path.to_string()),
                                enabled: true,
                            };
                            dispatch_task(&app_handle, reminder);
                        }
                    }

                    let tasks = scheduler::load_tasks();
                    let mut fired_once = Vec::new();
                    for task in &tasks {
                        let task_key = (task.id.clone(), task_date, task_hour, task_minute);
                        if scheduler::is_task_due(task, task_now) && fired_task_keys.insert(task_key) {
                            dispatch_task(&app_handle, task.clone());
                            if task.frequency == "Once" {
                                fired_once.push(task.id.clone());
                            }
                        }
                    }
                    if !fired_once.is_empty() {
                        if let Err(error) = scheduler::disable_once_tasks(&fired_once) {
                            let _ = app_handle.emit(
                                "task-error",
                                serde_json::json!({"taskId": "scheduler", "message": error}),
                            );
                        } else {
                            let _ = app_handle.emit("tasks-changed", scheduler::load_tasks());
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
            toggle_drop_zone,
            choose_audio_file,
            choose_task_file,
            save_export_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod command_tests {
    use super::*;

    #[test]
    fn adjusted_hijri_conversion_roundtrips() {
        for adjustment in [-1, 0, 1] {
            let hijri = convert_gregorian_to_hijri(2026, 5, 20, Some(adjustment)).unwrap();
            let gregorian =
                convert_hijri_to_gregorian(hijri.year, hijri.month, hijri.day, Some(adjustment))
                    .unwrap();
            assert_eq!(
                (gregorian.year, gregorian.month, gregorian.day),
                (2026, 5, 20)
            );
        }
    }

    #[test]
    fn prayer_switches_are_independent() {
        let mut prayers = settings::AdzanPrayers::default();
        prayers.fajr = false;
        assert!(!prayers.enabled("Fajr"));
        assert!(prayers.enabled("Dhuhr"));
        assert!(!prayers.enabled("Sunrise"));
    }
}
