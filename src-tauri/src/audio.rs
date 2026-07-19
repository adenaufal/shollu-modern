use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
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
        path: String,
        reply: Sender<Result<(), String>>,
    },
    Stop,
    SetVolume(f32),
}

static CMD_TX: OnceLock<Mutex<Sender<Command>>> = OnceLock::new();

/// Lazily spawn the audio worker thread and return its command sender.
fn cmd_tx() -> &'static Mutex<Sender<Command>> {
    CMD_TX.get_or_init(|| {
        let (tx, rx) = mpsc::channel::<Command>();
        thread::Builder::new()
            .name("shollu-audio".into())
            .spawn(move || audio_worker(rx))
            .expect("failed to spawn audio worker thread");
        Mutex::new(tx)
    })
}

/// Background worker that owns the `OutputStream` and `Sink` for its entire
/// lifetime, so they never cross a thread boundary.
fn audio_worker(rx: Receiver<Command>) {
    let mut stream: Option<OutputStream> = None;
    let mut sink: Option<Sink> = None;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            Command::Play { path, reply } => {
                // Tear down any current playback first: stop the sink, then
                // drop both the sink and the old output stream so the device
                // handle is released before we open a new one.
                if let Some(s) = sink.take() {
                    s.stop();
                }
                drop(stream.take());

                let result = (|| -> Result<(), String> {
                    let file = File::open(&path)
                        .map_err(|e| format!("Failed to open audio file '{}': {}", path, e))?;
                    let source = Decoder::new(BufReader::new(file))
                        .map_err(|e| format!("Failed to decode audio '{}': {}", path, e))?;
                    let (s, handle) = OutputStream::try_default()
                        .map_err(|e| format!("Failed to open audio output stream: {}", e))?;
                    let sk = Sink::try_new(&handle)
                        .map_err(|e| format!("Failed to create audio sink: {}", e))?;
                    sk.append(source);
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
            Command::SetVolume(volume) => {
                if let Some(ref s) = sink {
                    s.set_volume(volume);
                }
            }
        }
    }
}

/// Start playing an audio file (MP3, WAV, OGG).
pub fn play_audio(file_path: &str) -> Result<(), String> {
    let (reply_tx, reply_rx) = mpsc::channel();
    let tx = cmd_tx()
        .lock()
        .map_err(|_| "Audio command channel is poisoned".to_string())?;
    tx.send(Command::Play {
        path: file_path.to_string(),
        reply: reply_tx,
    })
    .map_err(|_| "Audio worker thread is not running".to_string())?;
    reply_rx
        .recv()
        .map_err(|_| "Audio worker thread did not respond".to_string())?
}

/// Stop any active audio playback.
pub fn stop_audio() {
    if let Ok(tx) = cmd_tx().lock() {
        let _ = tx.send(Command::Stop);
    }
}

/// Adjust the volume of the active player (value between 0.0 and 1.0).
pub fn set_volume(volume: f32) {
    if let Ok(tx) = cmd_tx().lock() {
        let _ = tx.send(Command::SetVolume(volume));
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
}