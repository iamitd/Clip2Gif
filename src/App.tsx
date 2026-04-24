import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent, SyntheticEvent } from "react";

type PreviewSettings = {
  inputPath: string;
  startTime: number;
  duration: number;
  outputWidth: number;
  outputHeight: number;
};

type SaveSettings = PreviewSettings;

type PreviewResult = {
  previewPath: string;
};

type ExportResult = {
  outputPath: string;
};

const videoExtensions = ["mp4", "webm", "mov", "mkv", "avi"];
const isTauri = "__TAURI_INTERNALS__" in window;
const defaultClipDuration = 3;
const minClipDuration = 0.2;
const minOutputSize = 80;
const maxOutputSize = 1920;
const defaultOutputWidth = 480;

function App() {
  const [selectedPath, setSelectedPath] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(defaultClipDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Choose a video to begin.");
  const [outputPath, setOutputPath] = useState("");
  const [error, setError] = useState("");
  const [isCreatingPreview, setIsCreatingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewGifPath, setPreviewGifPath] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [gifWidth, setGifWidth] = useState(defaultOutputWidth);
  const [gifHeight, setGifHeight] = useState(270);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const selectedFileName = selectedPath ? selectedPath.split(/[\\/]/).pop() : "No file selected";
  const previewSrc = selectedPath ? convertFileSrc(selectedPath) : "";
  const previewGifSrc = previewGifPath ? convertFileSrc(previewGifPath) : "";
  const safeDuration = videoDuration > 0 ? videoDuration : defaultClipDuration;
  const clipDuration = Math.max(0, clipEnd - clipStart);
  const clipStartPercent = (clipStart / safeDuration) * 100;
  const clipEndPercent = (clipEnd / safeDuration) * 100;
  const progressPercent = (currentTime / safeDuration) * 100;
  const isBusy = isCreatingPreview || isSaving;

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  function clampOutputSize(value: number) {
    return Math.min(maxOutputSize, Math.max(minOutputSize, Math.round(value)));
  }

  function setDefaultGifSize(videoWidth: number, videoHeight: number) {
    if (videoWidth <= 0 || videoHeight <= 0) {
      setGifWidth(defaultOutputWidth);
      setGifHeight(270);
      return;
    }

    const ratio = videoHeight / videoWidth;
    setGifWidth(defaultOutputWidth);
    setGifHeight(clampOutputSize(defaultOutputWidth * ratio));
  }

  function beginGifResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = gifWidth;
    const startHeight = gifHeight;

    function move(pointerEvent: globalThis.PointerEvent) {
      setGifWidth(clampOutputSize(startWidth + pointerEvent.clientX - startX));
      setGifHeight(clampOutputSize(startHeight + pointerEvent.clientY - startY));
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  function timeFromPointer(clientX: number) {
    const timeline = timelineRef.current;
    if (!timeline) {
      return 0;
    }

    const rect = timeline.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * safeDuration;
  }

  function seekVideo(time: number) {
    const nextTime = Math.min(Math.max(0, time), safeDuration);
    const video = videoRef.current;
    if (video) {
      video.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
  }

  function beginHandleDrag(handle: "start" | "end", event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!videoRef.current?.paused) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }

    function applyDrag(clientX: number) {
      const nextTime = timeFromPointer(clientX);

      if (handle === "start") {
        const nextStart = Math.min(Math.max(0, nextTime), clipEnd - minClipDuration);
        setClipStart(nextStart);
        seekVideo(nextStart);
      } else {
        const nextEnd = Math.max(Math.min(safeDuration, nextTime), clipStart + minClipDuration);
        setClipEnd(nextEnd);
        seekVideo(nextEnd);
      }
    }

    applyDrag(event.clientX);

    function move(pointerEvent: globalThis.PointerEvent) {
      applyDrag(pointerEvent.clientX);
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  function handleTimelineClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    seekVideo(timeFromPointer(event.clientX));
  }

  function handleMetadataLoaded(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      setVideoDuration(0);
      setClipStart(0);
      setClipEnd(defaultClipDuration);
      setCurrentTime(0);
      return;
    }

    setVideoDuration(duration);
    setClipStart(0);
    setClipEnd(Math.min(defaultClipDuration, duration));
    setCurrentTime(0);
    setDefaultGifSize(video.videoWidth, video.videoHeight);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const nextTime = event.currentTarget.currentTime;
    setCurrentTime(nextTime);

    if (isPlaying && nextTime >= clipEnd) {
      event.currentTarget.pause();
      event.currentTarget.currentTime = clipEnd;
      setCurrentTime(clipEnd);
      setIsPlaying(false);
    }
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      if (video.currentTime >= clipEnd || video.currentTime < clipStart) {
        video.currentTime = clipStart;
        setCurrentTime(clipStart);
      }

      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  async function playFromClipStart() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = clipStart;
    setCurrentTime(clipStart);
    await video.play();
    setIsPlaying(true);
  }

  function setStartAtCurrentTime() {
    const nextStart = Math.min(Math.max(0, currentTime), clipEnd - minClipDuration);
    setClipStart(nextStart);
    seekVideo(nextStart);
  }

  function setEndAtCurrentTime() {
    const nextEnd = Math.max(Math.min(safeDuration, currentTime), clipStart + minClipDuration);
    setClipEnd(nextEnd);
    seekVideo(nextEnd);
  }

  function validateExportSettings() {
    if (!selectedPath) {
      return "Select a video file first.";
    }

    if (!Number.isFinite(clipStart) || clipStart < 0) {
      return "Clip start must be 0 or greater.";
    }

    if (!Number.isFinite(clipDuration) || clipDuration <= 0) {
      return "Clip duration must be greater than 0.";
    }

    if (!Number.isInteger(gifWidth) || gifWidth < minOutputSize || gifWidth > maxOutputSize) {
      return `GIF width must be between ${minOutputSize} and ${maxOutputSize}px.`;
    }

    if (!Number.isInteger(gifHeight) || gifHeight < minOutputSize || gifHeight > maxOutputSize) {
      return `GIF height must be between ${minOutputSize} and ${maxOutputSize}px.`;
    }

    return "";
  }

  function currentSettings(): PreviewSettings {
    return {
      inputPath: selectedPath,
      startTime: clipStart,
      duration: clipDuration,
      outputWidth: gifWidth,
      outputHeight: gifHeight,
    };
  }

  async function selectVideo() {
    setError("");
    setOutputPath("");
    setPreviewGifPath("");
    setIsPreviewOpen(false);
    setStatus("Opening file picker...");

    if (!isTauri) {
      setStatus("Desktop runtime is not available.");
      setError("Select Video works only in the Tauri desktop app. Start it with `npm run tauri dev`, not `npm run dev` or a browser tab.");
      return;
    }

    let picked: string | null | string[];
    try {
      picked = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Video", extensions: videoExtensions }],
      });
    } catch (err) {
      setStatus("File picker failed.");
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    if (typeof picked !== "string") {
      setStatus("Video selection cancelled.");
      return;
    }

    setSelectedPath(picked);
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(defaultClipDuration);
    setCurrentTime(0);
    setIsPlaying(false);
    setDefaultGifSize(16, 9);
    setStatus("Video selected. Choose a clip and create a GIF preview.");
  }

  async function createGifPreview() {
    setError("");
    setOutputPath("");

    const validationError = validateExportSettings();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreatingPreview(true);
    setStatus("Creating GIF preview with FFmpeg...");

    try {
      const result = await invoke<PreviewResult>("create_gif_preview", { settings: currentSettings() });
      setPreviewGifPath(result.previewPath);
      setIsPreviewOpen(true);
      setStatus("GIF preview created. Adjust size and save it.");
    } catch (err) {
      setStatus("Preview failed.");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingPreview(false);
    }
  }

  async function saveGif() {
    setError("");

    const validationError = validateExportSettings();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setStatus("Saving final GIF with FFmpeg...");

    try {
      const result = await invoke<ExportResult>("save_gif", { settings: currentSettings() });
      setOutputPath(result.outputPath);
      setIsPreviewOpen(false);
      setStatus("GIF saved successfully.");
    } catch (err) {
      setStatus("Save failed.");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace compact-workspace">
        <div className="preview-card">
          <div className="compact-title">
            <h1>Clip2Gif</h1>
            <span>{clipDuration > 0 ? `${formatTime(clipStart)} - ${formatTime(clipEnd)} (${clipDuration.toFixed(1)}s)` : "Select a clip"}</span>
          </div>

          <div className="video-frame">
            {previewSrc ? (
              <video
                ref={videoRef}
                src={previewSrc}
                preload="metadata"
                onLoadedMetadata={handleMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
            ) : (
              <div className="empty-preview">Select a video to preview it here.</div>
            )}
          </div>

          <div className="video-controls">
            <button className="transport-button" type="button" onClick={togglePlayback} disabled={!selectedPath} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <span className="time-readout">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
            <div className="timeline" ref={timelineRef} onClick={handleTimelineClick} aria-label="Video timeline and clip range selector">
              <div className="timeline-track" />
              <div className="timeline-progress" style={{ width: `${progressPercent}%` }} />
              <div className="clip-selection" style={{ left: `${clipStartPercent}%`, width: `${clipEndPercent - clipStartPercent}%` }} />
              <button
                className="range-handle start-handle"
                type="button"
                style={{ left: `${clipStartPercent}%` }}
                onPointerDown={(event) => beginHandleDrag("start", event)}
                aria-label="Move clip start"
                disabled={!selectedPath || isBusy}
              />
              <button
                className="range-handle end-handle"
                type="button"
                style={{ left: `${clipEndPercent}%` }}
                onPointerDown={(event) => beginHandleDrag("end", event)}
                aria-label="Move clip end"
                disabled={!selectedPath || isBusy}
              />
            </div>
            <div className="clip-actions" aria-label="Clip actions">
              <button type="button" onClick={playFromClipStart} disabled={!selectedPath} title="Play from clip start" aria-label="Play from clip start">
                ↺
              </button>
              <button type="button" onClick={setStartAtCurrentTime} disabled={!selectedPath} title="Set start to current time" aria-label="Set start to current time">
                [
              </button>
              <button type="button" onClick={setEndAtCurrentTime} disabled={!selectedPath} title="Set end to current time" aria-label="Set end to current time">
                ]
              </button>
            </div>
          </div>

          <div className="main-actions">
            <button className="secondary-button" type="button" onClick={selectVideo} disabled={isBusy}>
              Select Video
            </button>
            <button className="primary-button" type="button" onClick={createGifPreview} disabled={isBusy || !selectedPath}>
              {isCreatingPreview ? "Creating..." : "Create GIF"}
            </button>
          </div>

          <div className="selected-file">
            <span>Selected file</span>
            <strong title={selectedPath}>{selectedFileName}</strong>
          </div>

          <div className="status-box">
            <span>Status</span>
            <p>{status}</p>
          </div>

          {outputPath ? (
            <div className="result-box">
              <span>Output path</span>
              <p>{outputPath}</p>
            </div>
          ) : null}

          {error ? <div className="error-box">{error}</div> : null}
        </div>
      </section>

      {isPreviewOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="GIF preview">
          <section className="gif-modal">
            <div className="modal-title">
              <div>
                <h2>GIF Preview</h2>
                <p>Resize the GIF, then save the final file.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsPreviewOpen(false)} disabled={isSaving} aria-label="Close preview">
                Close
              </button>
            </div>

            <div className="gif-preview-stage">
              {previewGifSrc ? (
                <div className="gif-resize-frame" style={{ width: gifWidth, height: gifHeight }}>
                  <img src={previewGifSrc} alt="Generated GIF preview" />
                  <button type="button" className="resize-handle" onPointerDown={beginGifResize} aria-label="Resize GIF preview" />
                </div>
              ) : null}
            </div>

            <div className="modal-controls">
              <label>
                <span>Width</span>
                <input min={minOutputSize} max={maxOutputSize} step="1" type="number" value={gifWidth} onChange={(event) => setGifWidth(clampOutputSize(Number(event.target.value)))} />
              </label>
              <label>
                <span>Height</span>
                <input min={minOutputSize} max={maxOutputSize} step="1" type="number" value={gifHeight} onChange={(event) => setGifHeight(clampOutputSize(Number(event.target.value)))} />
              </label>
              <button className="primary-button" type="button" onClick={saveGif} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save GIF"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
