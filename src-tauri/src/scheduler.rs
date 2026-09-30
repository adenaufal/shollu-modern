use chrono::{Datelike, NaiveDateTime, NaiveTime, Timelike};
use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, File};
use std::io::Read;
use std::path::PathBuf;
use std::sync::Mutex;

static TASK_FILE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub task_type: String, // "Info", "Warning", "MovingText", "Command", "Shutdown", "Hibernate", "Multimedia"
    pub frequency: String, // "Daily", "Weekly", "Monthly", "Once", "Start"
    pub time: String,      // "HH:mm"
    pub day_of_week: Option<u32>, // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    pub day_of_month: Option<u32>, // 1..31
    pub month: Option<u32>, // 1..12
    pub message: String,
    pub file_path: Option<String>,
    pub enabled: bool,
}

/// Fetch the tasks database file path
pub fn get_tasks_path() -> PathBuf {
    if let Some(path) = std::env::var_os("SHOLLU_CONFIG_DIR").filter(|value| !value.is_empty()) {
        return PathBuf::from(path).join("tasks.json");
    }
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("SholluModern");
    path.push("tasks.json");
    path
}

/// Load all scheduled tasks
pub fn load_tasks() -> Vec<ScheduledTask> {
    let _guard = TASK_FILE_LOCK
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    load_tasks_unlocked()
}

fn load_tasks_unlocked() -> Vec<ScheduledTask> {
    let path = get_tasks_path();
    if !path.exists() {
        return Vec::new();
    }

    let mut file = match File::open(&path) {
        Ok(f) => f,
        Err(error) => {
            eprintln!(
                "Failed to read tasks '{}': {}; using empty task list",
                path.display(),
                error
            );
            return Vec::new();
        }
    };

    let mut contents = String::new();
    if let Err(error) = file.read_to_string(&mut contents) {
        eprintln!(
            "Failed to read tasks '{}': {}; using empty task list",
            path.display(),
            error
        );
        return Vec::new();
    }

    let tasks: Vec<ScheduledTask> = serde_json::from_str(&contents).unwrap_or_else(|error| {
        eprintln!(
            "Failed to parse tasks '{}': {}; using empty task list",
            path.display(),
            error
        );
        Vec::new()
    });
    let mut ids = std::collections::HashSet::new();
    tasks
        .into_iter()
        .filter(|task| {
            if !ids.insert(task.id.clone()) {
                eprintln!("Ignoring scheduled task '{}': duplicate task ID", task.id);
                return false;
            }
            if let Err(error) = validate_tasks(std::slice::from_ref(task)) {
                eprintln!("Ignoring invalid scheduled task '{}': {}", task.id, error);
                false
            } else {
                true
            }
        })
        .collect()
}

/// Save all scheduled tasks
pub fn save_tasks(tasks: &[ScheduledTask]) -> Result<(), String> {
    let _guard = TASK_FILE_LOCK
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    save_tasks_unlocked(tasks)
}

fn save_tasks_unlocked(tasks: &[ScheduledTask]) -> Result<(), String> {
    validate_tasks(tasks)?;
    let path = get_tasks_path();

    if let Some(parent) = path.parent() {
        create_dir_all(parent).map_err(|e| {
            format!(
                "Failed to create tasks directory '{}': {}",
                parent.display(),
                e
            )
        })?;
    }

    let json_string = serde_json::to_string_pretty(tasks)
        .map_err(|e| format!("Failed to serialize tasks: {}", e))?;

    crate::settings::write_atomic(&path, json_string.as_bytes())
}

/// Disable only tasks that actually fired, preserving edits made by the UI
/// while the scheduler was dispatching them.
pub fn disable_once_tasks(ids: &[String]) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }
    let _guard = TASK_FILE_LOCK
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    let mut tasks = load_tasks_unlocked();
    let mut changed = false;
    for task in &mut tasks {
        if task.frequency == "Once" && task.enabled && ids.contains(&task.id) {
            task.enabled = false;
            changed = true;
        }
    }
    if changed {
        save_tasks_unlocked(&tasks)?;
    }
    Ok(())
}

pub fn validate_tasks(tasks: &[ScheduledTask]) -> Result<(), String> {
    let mut ids = std::collections::HashSet::new();
    const TYPES: &[&str] = &[
        "Info",
        "Warning",
        "MovingText",
        "Command",
        "Shutdown",
        "Hibernate",
        "Multimedia",
    ];
    const FREQUENCIES: &[&str] = &["Daily", "Weekly", "Monthly", "Once", "Start"];
    for task in tasks {
        if task.id.trim().is_empty() || !ids.insert(task.id.as_str()) {
            return Err("Every task needs a unique, non-empty ID".to_string());
        }
        if task.name.trim().is_empty() {
            return Err(format!("Task '{}' needs a name", task.id));
        }
        if !TYPES.contains(&task.task_type.as_str()) {
            return Err(format!("Task '{}' has an unsupported type", task.id));
        }
        if !FREQUENCIES.contains(&task.frequency.as_str()) {
            return Err(format!("Task '{}' has an unsupported frequency", task.id));
        }
        if task.frequency != "Start" && NaiveTime::parse_from_str(&task.time, "%H:%M").is_err() {
            return Err(format!("Task '{}' time must use HH:mm", task.id));
        }
        match task.frequency.as_str() {
            "Weekly" if !matches!(task.day_of_week, Some(1..=7)) => {
                return Err(format!("Task '{}' needs a weekday from 1 to 7", task.id))
            }
            "Monthly" if !matches!(task.day_of_month, Some(1..=31)) => {
                return Err(format!(
                    "Task '{}' needs a day of month from 1 to 31",
                    task.id
                ))
            }
            "Once"
                if !matches!(task.day_of_month, Some(1..=31))
                    || !matches!(task.month, Some(1..=12)) =>
            {
                return Err(format!("Task '{}' needs a valid day and month", task.id))
            }
            _ => {}
        }
        if matches!(task.task_type.as_str(), "Command" | "Multimedia")
            && task
                .file_path
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
        {
            return Err(format!("Task '{}' needs a file path", task.id));
        }
        if matches!(task.task_type.as_str(), "Info" | "Warning" | "MovingText")
            && task.message.trim().is_empty()
        {
            return Err(format!("Task '{}' needs a message", task.id));
        }
    }
    Ok(())
}

/// Check if a task is due for execution at the given local time
pub fn is_task_due(task: &ScheduledTask, now: NaiveDateTime) -> bool {
    if !task.enabled {
        return false;
    }

    // Parse task time
    let task_time = match NaiveTime::parse_from_str(&task.time, "%H:%M") {
        Ok(t) => t,
        Err(_) => return false,
    };

    // Check hour and minute matching
    if now.hour() != task_time.hour() || now.minute() != task_time.minute() {
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
        "Monthly" => task.day_of_month == Some(now.day()),
        "Once" => task.day_of_month == Some(now.day()) && task.month == Some(now.month()),
        "Start" => false, // Handled separately on application startup
        _ => false,
    }
}

/// Execute specific task actions (Command execution, PC power management)
pub fn execute_task_action(task: &ScheduledTask) -> Result<(), String> {
    use std::process::Command;
    let mut command = match task.task_type.as_str() {
        "Command" => {
            let path = task.file_path.as_deref().unwrap_or_default();
            if path.trim().is_empty() {
                return Err("Task command is empty".to_string());
            }
            Command::new(path)
        }
        "Shutdown" => {
            #[cfg(target_os = "windows")]
            {
                let mut command = Command::new("shutdown");
                command.args(["/s", "/t", "0"]);
                command
            }
            #[cfg(target_os = "macos")]
            {
                let mut command = Command::new("osascript");
                command.args(["-e", "tell app \"System Events\" to shut down"]);
                command
            }
            #[cfg(target_os = "linux")]
            {
                let mut command = Command::new("shutdown");
                command.args(["now"]);
                command
            }
        }
        "Hibernate" => {
            #[cfg(target_os = "windows")]
            {
                let mut command = Command::new("shutdown");
                command.args(["/h"]);
                command
            }
            #[cfg(target_os = "linux")]
            {
                let mut command = Command::new("systemctl");
                command.args(["hibernate"]);
                command
            }
            #[cfg(target_os = "macos")]
            {
                return Err("Hibernate action is not supported on macOS".to_string());
            }
        }
        _ => return Ok(()),
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to start {} action: {}", task.task_type, error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

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

        // Correct time, including a delayed scheduler tick within the minute
        let now = NaiveDate::from_ymd_opt(2026, 5, 24)
            .unwrap()
            .and_hms_opt(15, 30, 0)
            .unwrap();
        assert!(is_task_due(&task, now));
        let delayed_tick = NaiveDate::from_ymd_opt(2026, 5, 24)
            .unwrap()
            .and_hms_opt(15, 30, 42)
            .unwrap();
        assert!(is_task_due(&task, delayed_tick));

        // Incorrect time
        let now_wrong = NaiveDate::from_ymd_opt(2026, 5, 24)
            .unwrap()
            .and_hms_opt(15, 31, 0)
            .unwrap();
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
        let now_sunday = NaiveDate::from_ymd_opt(2026, 5, 24)
            .unwrap()
            .and_hms_opt(9, 0, 0)
            .unwrap();
        assert!(is_task_due(&task, now_sunday));

        // 25 May 2026 is a Monday (wrong day of week)
        let now_monday = NaiveDate::from_ymd_opt(2026, 5, 25)
            .unwrap()
            .and_hms_opt(9, 0, 0)
            .unwrap();
        assert!(!is_task_due(&task, now_monday));
    }

    #[test]
    fn rejects_invalid_tasks_before_persistence() {
        let task = ScheduledTask {
            id: "invalid".into(),
            name: "Weekly reminder".into(),
            task_type: "Info".into(),
            frequency: "Weekly".into(),
            time: "25:00".into(),
            day_of_week: Some(8),
            day_of_month: None,
            month: None,
            message: "Reminder".into(),
            file_path: None,
            enabled: true,
        };
        assert!(validate_tasks(&[task]).is_err());
    }

    #[test]
    fn rejects_action_tasks_without_file_path() {
        let mut task = ScheduledTask {
            id: "action".into(),
            name: "Run".into(),
            task_type: "Command".into(),
            frequency: "Daily".into(),
            time: "10:00".into(),
            day_of_week: None,
            day_of_month: None,
            month: None,
            message: String::new(),
            file_path: None,
            enabled: true,
        };
        assert!(validate_tasks(std::slice::from_ref(&task)).is_err());
        task.task_type = "Multimedia".into();
        assert!(validate_tasks(std::slice::from_ref(&task)).is_err());
        task.file_path = Some("C:/sound.wav".into());
        assert!(validate_tasks(&[task]).is_ok());
    }
}
