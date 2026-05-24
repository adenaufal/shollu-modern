use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Mutex, OnceLock};

struct Player {
    sink: Option<Sink>,
}

static PLAYER: OnceLock<Mutex<Player>> = OnceLock::new();

fn get_player() -> &'static Mutex<Player> {
    PLAYER.get_or_init(|| {
        Mutex::new(Player {
            sink: None,
        })
    })
}

/// Start playing an audio file (MP3, WAV, OGG) on a background thread
pub fn play_audio(file_path: &str) -> Result<(), String> {
    let mut p = get_player()
        .lock()
        .map_err(|e| format!("Audio mutex poisoned: {}", e))?;

    // Stop any currently playing audio
    if let Some(ref s) = p.sink {
        s.stop();
    }

    // Try to open the file
    let file = File::open(file_path).map_err(|e| format!("Failed to open audio file: {}", e))?;
    let reader = BufReader::new(file);

    // Try to decode
    let source = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

    // Try to initialize output stream and handle
    let (stream, stream_handle) = OutputStream::try_default()
        .map_err(|e| format!("Failed to open audio output stream: {}", e))?;

    let sink = Sink::try_new(&stream_handle)
        .map_err(|e| format!("Failed to create audio sink: {}", e))?;

    sink.append(source);
    sink.play();

    p.sink = Some(sink);

    // Leak output stream to keep it active
    std::mem::forget(stream);

    Ok(())
}

/// Stop any active audio playback
pub fn stop_audio() {
    let mut p = get_player().lock().unwrap();
    if let Some(ref s) = p.sink {
        s.stop();
    }
    p.sink = None;
}

/// Adjust the volume of the active player (value between 0.0 and 1.0)
pub fn set_volume(volume: f32) {
    let p = get_player().lock().unwrap();
    if let Some(ref s) = p.sink {
        s.set_volume(volume);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::OnceLock;

    fn test_guard() -> std::sync::MutexGuard<'static, ()> {
        static TEST_GUARD: OnceLock<std::sync::Mutex<()>> = OnceLock::new();
        TEST_GUARD
            .get_or_init(|| std::sync::Mutex::new(()))
            .lock()
            .unwrap()
    }

    #[test]
    fn test_audio_stop_safe_when_not_playing() {
        let _guard = test_guard();
        // Calling stop_audio when nothing is playing should be safe and silent
        stop_audio();
    }

    #[test]
    fn test_volume_set_safe() {
        let _guard = test_guard();
        set_volume(0.5);
    }

    #[test]
    fn test_play_audio_returns_error_when_mutex_poisoned() {
        let _guard = test_guard();
        let _ = std::thread::spawn(|| {
            let _player = get_player().lock().unwrap();
            panic!("poison audio mutex for test");
        })
        .join();

        let result = play_audio("unused-path-because-lock-fails-first");
        assert!(result
            .as_deref()
            .is_some_and(|msg| msg.contains("Audio mutex poisoned")));

        let player_mutex = get_player();
        if let Err(poisoned) = player_mutex.lock() {
            let mut player = poisoned.into_inner();
            if let Some(ref sink) = player.sink {
                sink.stop();
            }
            player.sink = None;
            drop(player);
            player_mutex.clear_poison();
        }
    }
}
