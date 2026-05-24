use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LanguageMeta {
    pub id: String,
    pub name: String,
}

/// Convert legacy language pack index to stable semantic string ID
pub fn get_key_for_index(index: usize) -> &'static str {
    match index {
        0 => "prayer.fajr",
        1 => "prayer.sunrise",
        2 => "prayer.dhuhr",
        3 => "prayer.asr",
        4 => "prayer.maghrib",
        5 => "prayer.isha",
        6 => "day.sunday",
        7 => "day.monday",
        8 => "day.tuesday",
        9 => "day.wednesday",
        10 => "day.thursday",
        11 => "day.friday",
        12 => "day.saturday",
        13 => "month.gregorian.january",
        14 => "month.gregorian.february",
        15 => "month.gregorian.march",
        16 => "month.gregorian.april",
        17 => "month.gregorian.may",
        18 => "month.gregorian.june",
        19 => "month.gregorian.july",
        20 => "month.gregorian.august",
        21 => "month.gregorian.september",
        22 => "month.gregorian.october",
        23 => "month.gregorian.november",
        24 => "month.gregorian.december",
        25 => "month.hijri.muharram",
        26 => "month.hijri.safar",
        27 => "month.hijri.rabiul_awal",
        28 => "month.hijri.rabiul_akhir",
        29 => "month.hijri.jumadil_awal",
        30 => "month.hijri.jumadil_akhir",
        31 => "month.hijri.rajab",
        32 => "month.hijri.syaban",
        33 => "month.hijri.ramadhan",
        34 => "month.hijri.syawal",
        35 => "month.hijri.dzulqaidah",
        36 => "month.hijri.dzulhijjah",
        37 => "param.latitude",
        38 => "param.longitude",
        39 => "param.altitude",
        40 => "param.timezone",
        41 => "param.organization",
        42 => "param.fiqh",
        43 => "button.ok",
        44 => "button.save",
        45 => "button.cancel",
        46 => "app.title",
        47 => "app.main_window",
        48 => "app.main_page",
        49 => "app.setting",
        50 => "app.prayer_times",
        51 => "app.message_info",
        52 => "app.schedule_maker",
        53 => "app.task_scheduler",
        54 => "app.about",
        55 => "app.yesterday",
        56 => "app.today",
        57 => "app.tomorrow",
        58 => "app.place_name",
        59 => "setting.window_title",
        60 => "setting.skin_color",
        61 => "setting.language",
        62 => "setting.adzan_sound",
        63 => "setting.play",
        64 => "setting.pause",
        65 => "setting.stop",
        66 => "setting.time_format",
        67 => "setting.autostart",
        68 => "setting.save",
        69 => "prayer.window_title",
        70 => "prayer.place_name",
        71 => "prayer.select_city",
        72 => "prayer.asr_times",
        73 => "prayer.add_zuhr",
        74 => "prayer.add_maghrib",
        75 => "method.karachi",
        76 => "method.isna",
        77 => "method.league",
        78 => "method.umm_al_qura",
        79 => "method.egypt",
        80 => "method.custom",
        81 => "prayer.load_data",
        82 => "prayer.use_selected",
        83 => "prayer.close",
        84 => "prayer.place_names",
        85 => "prayer.latitude",
        86 => "prayer.longitude",
        87 => "prayer.save",
        88 => "message.window_title",
        90 => "message.show_before",
        91 => "message.when_arrived",
        92 => "message.show_notification",
        93 => "message.minimize_windows",
        94 => "message.play_adzan",
        95 => "message.shutdown_pc",
        96 => "message.hibernate_pc",
        97 => "message.after_prayer",
        98 => "message.show_after",
        99 => "message.shutdown_after",
        100 => "message.hibernate_after",
        101 => "message.friday_prayer",
        102 => "message.show_info_every",
        103 => "message.minutes",
        104 => "message.save",
        105 => "schedule.window_title",
        106 => "schedule.create_table",
        107 => "schedule.select_start",
        108 => "schedule.select_end",
        109 => "schedule.time_format",
        110 => "schedule.save_format",
        111 => "schedule.html",
        112 => "schedule.tsv",
        113 => "schedule.csv",
        114 => "schedule.select_bg_color",
        115 => "schedule.save_file",
        116 => "task.name",
        117 => "task.type",
        118 => "task.frequency",
        119 => "task.time",
        120 => "task.day_of_week",
        121 => "task.date",
        122 => "task.month",
        123 => "task.message",
        124 => "task.open_file",
        125 => "task.add",
        126 => "task.delete",
        127 => "task.cancel",
        128 => "task.save",
        129 => "task.close",
        130 => "about.window_title",
        131 => "msg.already_running",
        132 => "msg.time_to_pray",
        133 => "msg.minutes_to_prayer",
        134 => "msg.friday_prep",
        135 => "msg.minutes_left",
        136 => "msg.confirm_close",
        137 => "msg.confirm_hibernate",
        138 => "msg.no_hibernate",
        139 => "msg.confirm_shutdown",
        140 => "msg.help_not_found",
        141 => "tray.open",
        142 => "tray.hide",
        143 => "tray.setting",
        144 => "tray.prayer_setting",
        145 => "tray.message_setting",
        146 => "tray.schedule_maker",
        147 => "tray.task_scheduler",
        148 => "tray.converter",
        149 => "tray.open_help",
        150 => "tray.shutdown_pc",
        151 => "tray.hibernate_pc",
        152 => "tray.close",
        153 => "tray.adzan",
        154 => "tray.stop_adzan",
        155 => "tray.pause_adzan",
        156 => "tray.play_adzan",
        157 => "tray.about",
        158 => "error.invalid_coords",
        159 => "error.invalid_tz_alt",
        160 => "error.invalid_zuhr_maghrib",
        161 => "error.invalid_gd_gn",
        162 => "places.total_places",
        163 => "places.open_file",
        164 => "dialog.info",
        165 => "dialog.warning",
        166 => "dialog.question",
        167 => "dialog.error",
        168 => "schedule.table_for",
        169 => "schedule.gd",
        170 => "schedule.gn",
        171 => "schedule.tz",
        172 => "schedule.asr_basis",
        173 => "schedule.fajr_isha_basis",
        174 => "task.cannot_save",
        175 => "task.invalid_message",
        176 => "task.invalid_name",
        177 => "task.forbidden_chars",
        178 => "task.file_not_found",
        179 => "task.confirm_delete",
        180 => "adzan.open_file",
        181 => "adzan.file_not_found",
        182 => "date.date",
        183 => "date.gregorian",
        184 => "date.hijri",
        185 => "date.month",
        186 => "task.type.none",
        187 => "task.type.info",
        188 => "task.type.error",
        189 => "task.type.warning",
        190 => "task.type.question",
        191 => "task.type.command",
        192 => "task.type.shutdown",
        193 => "task.type.hibernate",
        194 => "task.type.moving_text",
        195 => "task.freq.none",
        196 => "task.freq.daily",
        197 => "task.freq.weekly",
        198 => "task.freq.monthly",
        199 => "task.freq.once",
        200 => "task.freq.start",
        201 => "setting.fajr_isha_conventions",
        202 => "setting.color",
        203 => "msg.time_to_pray_remaining",
        204 => "msg.remaining",
        205 => "prayer.qibla",
        206 => "setting.dialog_message",
        207 => "setting.effect",
        208 => "setting.effect.top",
        209 => "setting.effect.center",
        210 => "setting.effect.bottom",
        211 => "setting.speed.very_fast",
        212 => "setting.speed.fast",
        213 => "setting.speed.normal",
        214 => "setting.speed.slow",
        215 => "setting.speed.very_slow",
        216 => "task.type.multimedia",
        217 => "prayer.add_fajr",
        218 => "prayer.add_asr",
        219 => "prayer.add_isha",
        220 => "setting.round.down",
        221 => "setting.round.up",
        222 => "setting.round.normal",
        223 => "setting.always_on_top",
        224 => "setting.hijri_correction",
        225 => "setting.remaining_time",
        _ => "unknown",
    }
}

/// Parse a legacy `.slp` language pack file
pub fn parse_slp_file(file_path: &Path) -> Result<HashMap<String, String>, String> {
    let bytes = std::fs::read(file_path).map_err(|e| format!("Failed to read slp: {}", e))?;

    let mut map = HashMap::new();
    let mut index = 0;
    let mut header_done = false;

    for line_bytes in bytes.split(|&b| b == b'\n') {
        let mut line_bytes = line_bytes;
        if line_bytes.ends_with(b"\r") {
            line_bytes = &line_bytes[..line_bytes.len() - 1];
        }

        // Convert Latin-1/CP1252 safely to String
        let line: String = line_bytes.iter().map(|&b| b as char).collect();
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with(';') {
            continue;
        }

        if !header_done {
            if trimmed == "Shollu3" {
                header_done = true;
            }
            continue;
        }

        let key = get_key_for_index(index);
        if key != "unknown" {
            map.insert(key.to_string(), trimmed.to_string());
        }
        index += 1;
    }

    Ok(map)
}

/// List all available languages
pub fn list_languages(languages_dir: &Path) -> Result<Vec<LanguageMeta>, String> {
    let mut list = Vec::new();
    if !languages_dir.exists() {
        return Ok(list);
    }

    let entries = std::fs::read_dir(languages_dir).map_err(|e| format!("Failed to read lang dir: {}", e))?;
    for entry_res in entries {
        let entry = entry_res.map_err(|e| format!("Failed to parse entry: {}", e))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("slp") {
            let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
            list.push(LanguageMeta {
                id: filename.to_string(),
                name: filename.to_string(),
            });
        }
    }

    list.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(list)
}

/// Fetch all translations for a language pack
pub fn get_translations(languages_dir: &Path, lang_id: &str) -> Result<HashMap<String, String>, String> {
    let file_path = languages_dir.join(format!("{}.slp", lang_id));
    if !file_path.exists() {
        return Err(format!("Language pack {}.slp not found", lang_id));
    }
    parse_slp_file(&file_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn get_test_lang_dir() -> PathBuf {
        let mut p = PathBuf::from("Languages");
        if !p.exists() {
            p = PathBuf::from("src-tauri/Languages");
        }
        p
    }

    #[test]
    fn test_list_languages() {
        let lang_dir = get_test_lang_dir();
        let res = list_languages(&lang_dir);
        assert!(res.is_ok());
        let list = res.unwrap();
        assert!(!list.is_empty());
    }

    #[test]
    fn test_parse_english_slp() {
        let lang_dir = get_test_lang_dir();
        let map = get_translations(&lang_dir, "English").unwrap();
        assert!(!map.is_empty());
        assert_eq!(map.get("prayer.fajr").map(|s| s.as_str()), Some("Fajr"));
        assert_eq!(map.get("day.sunday").map(|s| s.as_str()), Some("Sunday"));
        assert_eq!(map.get("month.gregorian.january").map(|s| s.as_str()), Some("January"));
    }

    #[test]
    fn test_parse_indonesia_slp() {
        let lang_dir = get_test_lang_dir();
        let map = get_translations(&lang_dir, "Indonesia").unwrap();
        assert!(!map.is_empty());
        assert_eq!(map.get("prayer.fajr").map(|s| s.as_str()), Some("Shubuh"));
        assert_eq!(map.get("day.sunday").map(|s| s.as_str()), Some("Ahad"));
        assert_eq!(map.get("month.gregorian.january").map(|s| s.as_str()), Some("Januari"));
    }
}
