use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use chrono::{Datelike, Local, NaiveTime, Timelike};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub task_type: String, // "Info", "Warning", "MovingText", "Command", "Shutdown", "Hibernate", "Multimedia"
    pub frequency: String, // "Daily", "Weekly", "Monthly", "Once", "Start"
    pub time: String,      // "HH:mm"
    pub day_of_week: Option<u32>, // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    pub day_of_month: Option<u32>, // 1..31
    pub month: Option<u32>,        // 1..12
    pub message: String,
    pub file_path: Option<String>,
    pub enabled: bool,
}

/// Fetch the tasks database file path
pub fn get_tasks_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("SholluModern");
    path.push("tasks.json");
    path
}

/// Load all scheduled tasks
pub fn load_tasks() -> Vec<ScheduledTask> {
    let path = get_tasks_path();
    if !path.exists() {
        return Vec::new();
    }

    let mut file = match File::open(&path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    let mut contents = String::new();
    if file.read_to_string(&mut contents).is_err() {
        return Vec::new();
    }

    serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new())
}

/// Save all scheduled tasks
pub fn save_tasks(tasks: &[ScheduledTask]) -> Result<(), String> {
    let path = get_tasks_path();

    if let Some(parent) = path.parent() {
        create_dir_all(parent).map_err(|e| format!("Failed to create tasks directory: {}", e))?;
    }

    let json_string = serde_json::to_string_pretty(tasks)
        .map_err(|e| format!("Failed to serialize tasks: {}", e))?;

    let mut file = File::create(&path)
        .map_err(|e| format!("Failed to create tasks file: {}", e))?;

    file.write_all(json_string.as_bytes())
        .map_err(|e| format!("Failed to write tasks: {}", e))?;

    Ok(())
}

/// Check if a task is due for execution at the given local time
pub fn is_task_due(task: &ScheduledTask, now: chrono::DateTime<Local>) -> bool {
    if !task.enabled {
        return false;
    }

    // Parse task time
    let task_time = match NaiveTime::parse_from_str(&task.time, "%H:%M") {
        Ok(t) => t,
        Err(_) => return false,
    };

    // Check hour and minute matching
    if now.hour() != task_time.hour() || now.minute() != task_time.minute() || now.second() != 0 {
        return false;
    }

    match task.frequency.as_str() {
        "Daily" => true,
        "Weekly" => {
            // chrono weekday is 0-indexed (Mon=0, Tue=1, ..., Sun=6)
            // original day_of_week is 1-indexed (Sun=1, Mon=2, ..., Sat=7)
            let current_weekday_1 = match now.weekday() {
                chrono::Weekday::Sun => 1,
                chrono::Weekday::Mon => 2,
                chrono::Weekday::Tue => 3,
                chrono::Weekday::Wed => 4,
                chrono::Weekday::Thu => 5,
                chrono::Weekday::Fri => 6,
                chrono::Weekday::Sat => 7,
            };
            task.day_of_week == Some(current_weekday_1)
        }
        "Monthly" => {
            task.day_of_month == Some(now.day())
        }
        "Once" => {
            let matches_date = task.day_of_month == Some(now.day())
                && task.month == Some(now.month());
            matches_date
        }
        "Start" => false, // Handled separately on application startup
        _ => false,
    }
}

/// Execute specific task actions (Command execution, PC power management)
pub fn execute_task_action(task: &ScheduledTask) {
    match task.task_type.as_str() {
        "Command" => {
            if let Some(cmd) = &task.file_path {
                #[cfg(target_os = "windows")]
                let _ = std::process::Command::new("cmd")
                    .args(["/C", cmd])
                    .spawn();
                
                #[cfg(not(target_os = "windows"))]
                let _ = std::process::Command::new("sh")
                    .args(["-c", cmd])
                    .spawn();
            }
        }
        "Shutdown" => {
            #[cfg(target_os = "windows")]
            let _ = std::process::Command::new("shutdown")
                .args(["/s", "/t", "0"])
                .spawn();

            #[cfg(target_os = "macos")]
            let _ = std::process::Command::new("osascript")
                .args(["-e", "tell app \"System Events\" to shut down"])
                .spawn();

            #[cfg(target_os = "linux")]
            let _ = std::process::Command::new("shutdown")
                .args(["now"])
                .spawn();
        }
        "Hibernate" => {
            #[cfg(target_os = "windows")]
            let _ = std::process::Command::new("shutdown")
                .args(["/h"])
                .spawn();

            #[cfg(target_os = "linux")]
            let _ = std::process::Command::new("systemctl")
                .args(["hibernate"])
                .spawn();
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_task_is_due_daily() {
        let task = ScheduledTask {
            id: "1".to_string(),
            name: "Test Daily".to_string(),
            task_type: "Info".to_string(),
            frequency: "Daily".to_string(),
            time: "15:30".to_string(),
            day_of_week: None,
            day_of_month: None,
            month: None,
            message: "Hello".to_string(),
            file_path: None,
            enabled: true,
        };

        // Correct time
        let now = Local.with_ymd_and_hms(2026, 5, 24, 15, 30, 0).unwrap();
        assert!(is_task_due(&task, now));

        // Incorrect time
        let now_wrong = Local.with_ymd_and_hms(2026, 5, 24, 15, 31, 0).unwrap();
        assert!(!is_task_due(&task, now_wrong));
    }

    #[test]
    fn test_task_is_due_weekly() {
        let task = ScheduledTask {
            id: "2".to_string(),
            name: "Test Weekly".to_string(),
            task_type: "Info".to_string(),
            frequency: "Weekly".to_string(),
            time: "09:00".to_string(),
            day_of_week: Some(1), // Sunday
            day_of_month: None,
            month: None,
            message: "Hello Sunday".to_string(),
            file_path: None,
            enabled: true,
        };

        // 24 May 2026 is a Sunday
        let now_sunday = Local.with_ymd_and_hms(2026, 5, 24, 9, 0, 0).unwrap();
        assert!(is_task_due(&task, now_sunday));

        // 25 May 2026 is a Monday (wrong day of week)
        let now_monday = Local.with_ymd_and_hms(2026, 5, 25, 9, 0, 0).unwrap();
        assert!(!is_task_due(&task, now_monday));
    }
}
