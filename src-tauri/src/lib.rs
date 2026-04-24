use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const GIF_FPS: u32 = 15;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GifSettings {
    input_path: String,
    start_time: f64,
    duration: f64,
    output_width: u32,
    output_height: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PreviewResult {
    preview_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    output_path: String,
}

#[tauri::command]
fn create_gif_preview(settings: GifSettings) -> Result<PreviewResult, String> {
    validate_settings(&settings)?;

    let input_path = PathBuf::from(&settings.input_path);
    if !input_path.exists() {
        return Err("Selected video file does not exist.".to_string());
    }

    let output_path = preview_output_path()?;
    run_ffmpeg(&settings, &input_path, &output_path)?;

    Ok(PreviewResult {
        preview_path: output_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn save_gif(settings: GifSettings) -> Result<ExportResult, String> {
    validate_settings(&settings)?;

    let input_path = PathBuf::from(&settings.input_path);
    if !input_path.exists() {
        return Err("Selected video file does not exist.".to_string());
    }

    let output_path = final_output_path_for(&input_path)?;
    run_ffmpeg(&settings, &input_path, &output_path)?;

    Ok(ExportResult {
        output_path: output_path.to_string_lossy().to_string(),
    })
}

fn run_ffmpeg(settings: &GifSettings, input_path: &Path, output_path: &Path) -> Result<(), String> {
    let video_filter = format!(
        "fps={},scale={}:{}:flags=lanczos",
        GIF_FPS, settings.output_width, settings.output_height
    );

    let output = Command::new("ffmpeg")
        .arg("-y")
        .arg("-ss")
        .arg(settings.start_time.to_string())
        .arg("-t")
        .arg(settings.duration.to_string())
        .arg("-i")
        .arg(input_path)
        .arg("-vf")
        .arg(video_filter)
        .arg(output_path)
        .output()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "FFmpeg was not found. Install FFmpeg and make sure `ffmpeg` is available in PATH.".to_string()
            } else {
                format!("Failed to start FFmpeg: {error}")
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            return Err(format!("FFmpeg failed with status: {}", output.status));
        }

        return Err(format!("FFmpeg failed: {stderr}"));
    }

    Ok(())
}

fn validate_settings(settings: &GifSettings) -> Result<(), String> {
    if settings.input_path.trim().is_empty() {
        return Err("Select a video file first.".to_string());
    }

    if !settings.start_time.is_finite() || settings.start_time < 0.0 {
        return Err("Start time must be 0 or greater.".to_string());
    }

    if !settings.duration.is_finite() || settings.duration <= 0.0 {
        return Err("Duration must be greater than 0.".to_string());
    }

    if !(80..=1920).contains(&settings.output_width) {
        return Err("GIF width must be between 80 and 1920px.".to_string());
    }

    if !(80..=1920).contains(&settings.output_height) {
        return Err("GIF height must be between 80 and 1920px.".to_string());
    }

    Ok(())
}

fn preview_output_path() -> Result<PathBuf, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not create a preview timestamp: {error}"))?
        .as_millis();

    Ok(std::env::temp_dir().join(format!("clip2gif-preview-{timestamp}.gif")))
}

fn final_output_path_for(input_path: &Path) -> Result<PathBuf, String> {
    let parent = input_path
        .parent()
        .ok_or_else(|| "Could not determine the selected file folder.".to_string())?;
    let stem = input_path
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Could not determine the selected file name.".to_string())?;

    let mut candidate = parent.join(format!("{stem}.gif"));
    if !candidate.exists() {
        return Ok(candidate);
    }

    for index in 1..1000 {
        candidate = parent.join(format!("{stem}-{index}.gif"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("Could not create a unique GIF file name.".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![create_gif_preview, save_gif])
        .run(tauri::generate_context!())
        .expect("error while running Clip2Gif");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_duration() {
        let settings = GifSettings {
            input_path: "video.mp4".to_string(),
            start_time: 0.0,
            duration: 0.0,
            output_width: 480,
            output_height: 270,
        };

        assert!(validate_settings(&settings).is_err());
    }
}
