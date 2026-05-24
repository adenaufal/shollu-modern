mod prayer_times;

use chrono::Datelike;
use prayer_times::{compute, Adjustments, Location, Madhab, Method, PrayerTimes};

#[tauri::command]
fn compute_prayer_times_demo() -> PrayerTimes {
    let today = chrono::Local::now().date_naive();
    let doy = today.ordinal() as u16;
    compute(
        doy,
        Location {
            latitude: -6.2088,
            longitude: 106.8456,
            altitude: 7,
            tz_hours: 7.0,
        },
        Method::Isna,
        Madhab::Shafii,
        Adjustments::default(),
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![compute_prayer_times_demo])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
