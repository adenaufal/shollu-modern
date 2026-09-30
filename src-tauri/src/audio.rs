use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Mutex, OnceLock};
use std::thread;

// `OutputStream` is `!Send` (it wraps a cpal device handle), so it cannot live
// in a `Sync` static nor be moved across threads. The safe, leak-free pattern
// is to create and own the `OutputStream` entirely on a dedicated long-lived
// audio thread, and drive it via a channel. This avoids the `mem::forget`
// stream leak from the original rodio usage without any `unsafe impl Send`.

enum Command {
    Play {
        paths: Vec<PathBuf>,
        reply: Sender<Result<(), String>>,
    },
    Stop,
    SetVolume(f32),
    IsPlaying(Sender<bool>),
}

static CMD_TX: OnceLock<Result<Mutex<Sender<Command>>, String>> = OnceLock::new();

/// Lazily spawn the audio worker thread and return its command sender.
fn cmd_tx() -> Result<&'static Mutex<Sender<Command>>, String> {
    CMD_TX
        .get_or_init(|| {
            let (tx, rx) = mpsc::channel::<Command>();
            thread::Builder::new()
                .name("shollu-audio".into())
                .spawn(move || audio_worker(rx))
                .map_err(|error| format!("Failed to start audio worker: {}", error))?;
            Ok(Mutex::new(tx))
        })
        .as_ref()
        .map_err(Clone::clone)
}

/// Background worker that owns the `OutputStream` and `Sink` for its entire
/// lifetime, so they never cross a thread boundary.
fn audio_worker(rx: Receiver<Command>) {
    let mut stream: Option<OutputStream> = None;
    let mut sink: Option<Sink> = None;
    let mut volume = 1.0;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            Command::Play { paths, reply } => {
                let result = (|| -> Result<(), String> {
                    // Validate and decode every file before stopping the current
                    // playback, so a bad queued track does not interrupt audio.
                    let sources = paths
                        .iter()
                        .map(|path| {
                            let file = File::open(path).map_err(|e| {
                                format!("Failed to open audio file '{}': {}", path.display(), e)
                            })?;
                            Decoder::new(BufReader::new(file)).map_err(|e| {
                                format!("Failed to decode audio '{}': {}", path.display(), e)
                            })
                        })
                        .collect::<Result<Vec<_>, _>>()?;

                    if let Some(s) = sink.take() {
                        s.stop();
                    }
                    drop(stream.take());
                    let (s, handle) = OutputStream::try_default()
                        .map_err(|e| format!("Failed to open audio output stream: {}", e))?;
                    let sk = Sink::try_new(&handle)
                        .map_err(|e| format!("Failed to create audio sink: {}", e))?;
                    sk.set_volume(volume);
                    for source in sources {
                        sk.append(source);
                    }
                    sk.play();
                    stream = Some(s);
                    sink = Some(sk);
                    Ok(())
                })();
                let _ = reply.send(result);
            }
            Command::Stop => {
                if let Some(s) = sink.take() {
                    s.stop();
                }
                drop(stream.take());
            }
            Command::SetVolume(value) => {
                // Keep the desired setting even when playback starts later.
                // This also makes mute-before-preview deterministic.
                volume = value.clamp(0.0, 1.0);
                if let Some(ref s) = sink {
                    s.set_volume(volume);
                }
            }
            Command::IsPlaying(reply) => {
                let _ = reply.send(sink.as_ref().is_some_and(|s| !s.empty()));
                if sink.as_ref().is_some_and(Sink::empty) {
                    sink.take();
                    drop(stream.take());
                }
            }
        }
    }
}

/// Start playing an audio file (MP3, WAV, OGG).
pub fn play_audio(file_path: &str) -> Result<(), String> {
    play_sequence(&[PathBuf::from(file_path)])
}

/// Play a set of tracks in order on the same sink.
pub fn play_sequence(paths: &[PathBuf]) -> Result<(), String> {
    if paths.is_empty() {
        return Err("At least one audio file is required".into());
    }
    let (reply_tx, reply_rx) = mpsc::channel();
    let tx = cmd_tx()?
        .lock()
        .map_err(|_| "Audio command channel is poisoned".to_string())?;
    tx.send(Command::Play {
        paths: paths.to_vec(),
        reply: reply_tx,
    })
    .map_err(|_| "Audio worker thread is not running".to_string())?;
    reply_rx
        .recv()
        .map_err(|_| "Audio worker thread did not respond".to_string())?
}

/// Return whether the active sink has audio queued or playing.
pub fn is_playing() -> Result<bool, String> {
    let (reply_tx, reply_rx) = mpsc::channel();
    let tx = cmd_tx()?
        .lock()
        .map_err(|_| "Audio command channel is poisoned".to_string())?;
    tx.send(Command::IsPlaying(reply_tx))
        .map_err(|_| "Audio worker thread is not running".to_string())?;
    reply_rx
        .recv()
        .map_err(|_| "Audio worker thread did not respond".to_string())
}

/// Map an enabled prayer name to the original Shollu3 bundled adhan track.
pub fn bundled_adhan_filename(prayer: &str) -> Result<&'static str, String> {
    match prayer.trim().to_ascii_lowercase().as_str() {
        "fajr" => Ok("azan-fajr.mp3"),
        "dhuhr" | "isha" => Ok("azan-mecca.mp3"),
        "asr" => Ok("azan-egypt.mp3"),
        "maghrib" => Ok("azan-dammam.mp3"),
        _ => Err(format!("Unknown prayer for adhan playback: {}", prayer)),
    }
}

/// Resolve a bundled audio file in packaged resources or a development checkout.
pub fn bundled_audio_path(resource_dir: &Path, filename: &str) -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    let candidates = vec![
        resource_dir.join("audio").join(filename),
        PathBuf::from("src-tauri").join("audio").join(filename),
        PathBuf::from("audio").join(filename),
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("audio")
            .join(filename),
    ];
    #[cfg(not(debug_assertions))]
    let candidates = vec![resource_dir.join("audio").join(filename)];
    candidates
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| format!("Bundled audio resource '{}' was not found", filename))
}

/// Build the ordered adhan + dua sequence, using a custom adhan when configured.
pub fn prayer_audio_sequence(
    resource_dir: &Path,
    prayer: &str,
    custom_adhan: Option<&Path>,
) -> Result<Vec<PathBuf>, String> {
    let bundled_filename = bundled_adhan_filename(prayer)?;
    let adhan = match custom_adhan {
        Some(path) => path.to_path_buf(),
        None => bundled_audio_path(resource_dir, bundled_filename)?,
    };
    let dua = bundled_audio_path(resource_dir, "dua.mp3")?;
    Ok(vec![adhan, dua])
}

/// Stop any active audio playback.
pub fn stop_audio() {
    if let Ok(tx) = cmd_tx() {
        if let Ok(tx) = tx.lock() {
            let _ = tx.send(Command::Stop);
        }
    }
}

/// Adjust the volume of the active player (value between 0.0 and 1.0).
pub fn set_volume(volume: f32) {
    if volume.is_finite() {
        if let Ok(tx) = cmd_tx() {
            if let Ok(tx) = tx.lock() {
                let _ = tx.send(Command::SetVolume(volume.clamp(0.0, 1.0)));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_stop_safe_when_not_playing() {
        // Calling stop_audio when nothing is playing should be safe and silent.
        // The worker handles Stop with no active sink as a no-op and never
        // touches a real audio device for non-Play commands.
        stop_audio();
    }

    #[test]
    fn test_volume_set_safe() {
        // set_volume with no active sink is a no-op on the worker thread.
        set_volume(0.5);
    }

    #[test]
    fn prayer_track_mapping_and_invalid_names() {
        assert_eq!(bundled_adhan_filename("Fajr").unwrap(), "azan-fajr.mp3");
        assert_eq!(bundled_adhan_filename(" dhuhr ").unwrap(), "azan-mecca.mp3");
        assert_eq!(bundled_adhan_filename("Isha").unwrap(), "azan-mecca.mp3");
        assert_eq!(bundled_adhan_filename("Asr").unwrap(), "azan-egypt.mp3");
        assert_eq!(
            bundled_adhan_filename("Maghrib").unwrap(),
            "azan-dammam.mp3"
        );
        assert!(bundled_adhan_filename("Sunrise").is_err());
        assert!(bundled_adhan_filename("unknown").is_err());
    }

    #[test]
    fn bundled_prayer_sequence_decodes_real_tracks_without_audio_device() {
        let audio_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("audio");
        let resource_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let expected = [
            ("Fajr", "azan-fajr.mp3"),
            ("Dhuhr", "azan-mecca.mp3"),
            ("Asr", "azan-egypt.mp3"),
            ("Maghrib", "azan-dammam.mp3"),
            ("Isha", "azan-mecca.mp3"),
        ];
        for (prayer, adhan_name) in expected {
            let sequence = prayer_audio_sequence(&resource_dir, prayer, None).unwrap();
            assert_eq!(sequence[0], audio_dir.join(adhan_name));
            assert_eq!(sequence[1], audio_dir.join("dua.mp3"));
            for path in sequence {
                let file = File::open(&path).unwrap();
                let decoder = Decoder::new(BufReader::new(file)).unwrap();
                assert!(decoder.count() > 0, "{} decoded no samples", path.display());
            }
        }
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn release_resource_resolution_does_not_fall_back_to_checkout_assets() {
        let resource_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("missing-resources");
        assert!(
            bundled_audio_path(&resource_dir, "dua.mp3").is_err(),
            "release lookup must not use the checkout audio directory"
        );
    }

    #[test]
    fn custom_adhan_remains_global_override_and_dua_follows() {
        let resource_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let custom = PathBuf::from("custom-adhan.mp3");
        let sequence = prayer_audio_sequence(&resource_dir, "Asr", Some(&custom)).unwrap();
        assert_eq!(
            sequence,
            [custom.clone(), resource_dir.join("audio/dua.mp3")]
        );
        assert!(prayer_audio_sequence(&resource_dir, "Sunrise", Some(&custom)).is_err());
    }
}
