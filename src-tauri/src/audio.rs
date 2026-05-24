use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Mutex, OnceLock};

struct Player {
    sink: Option<Sink>,
    stream: Option<OutputStream>,
}

static PLAYER: OnceLock<Mutex<Player>> = OnceLock::new();

fn get_player() -> &'static Mutex<Player> {
    PLAYER.get_or_init(|| {
        Mutex::new(Player {
            sink: None,
            stream: None,
        })
    })
}

/// Start playing an audio file (MP3, WAV, OGG) on a background thread
pub fn play_audio(file_path: &str) -> Result<(), String> {
    let mut p = get_player().lock().unwrap();

    // Stop any currently playing audio
    if let Some(ref s) = p.sink {
        s.stop();
    }

    // Try to open the file
    let file = File::open(file_path).map_err(|e| format!("Failed to open audio file '{}': {}", file_path, e))?;
    let reader = BufReader::new(file);

    // Try to decode
    let source = Decoder::new(reader).map_err(|e| format!("Failed to decode audio '{}': {}", file_path, e))?;

    // Try to initialize output stream and handle
    let (stream, stream_handle) = OutputStream::try_default()
        .map_err(|e| format!("Failed to open audio output stream: {}", e))?;

    let sink = Sink::try_new(&stream_handle)
        .map_err(|e| format!("Failed to create audio sink: {}", e))?;

    sink.append(source);
    sink.play();

    p.sink = Some(sink);
    p.stream = Some(stream);

    Ok(())
}

/// Stop any active audio playback
pub fn stop_audio() {
    let mut p = get_player().lock().unwrap();
    if let Some(ref s) = p.sink {
        s.stop();
    }
    p.sink = None;
    p.stream = None;
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

    #[test]
    fn test_audio_stop_safe_when_not_playing() {
        // Calling stop_audio when nothing is playing should be safe and silent
        stop_audio();
    }

    #[test]
    fn test_volume_set_safe() {
        set_volume(0.5);
    }
}
