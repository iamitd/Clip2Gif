import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent, PointerEvent, SyntheticEvent } from "react";
import { renderGif } from "./ffmpegGif";
import { gifDownloadName, maxOutputSize, minOutputSize, validateExportSettings, validateVideoFile } from "./exportValidation";

const defaultClipDuration = 3;
const minClipDuration = 0.2;
const defaultOutputWidth = 480;

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(defaultClipDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Choose a video to begin.");
  const [error, setError] = useState("");
  const [isCreatingPreview, setIsCreatingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [gifPreviewUrl, setGifPreviewUrl] = useState("");
  const [gifPreviewBlob, setGifPreviewBlob] = useState<Blob | null>(null);
  const [gifPreviewKey, setGifPreviewKey] = useState("");
  const [gifWidth, setGifWidth] = useState(defaultOutputWidth);
  const [gifHeight, setGifHeight] = useState(270);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const selectedFileName = selectedFile?.name ?? "No file selected";
  const safeDuration = videoDuration > 0 ? videoDuration : defaultClipDuration;
  const clipDuration = Math.max(0, clipEnd - clipStart);
  const clipStartPercent = (clipStart / safeDuration) * 100;
  const clipEndPercent = (clipEnd / safeDuration) * 100;
  const progressPercent = (currentTime / safeDuration) * 100;
  const isBusy = isCreatingPreview || isDownloading;

  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  useEffect(() => {
    return () => {
      if (gifPreviewUrl) {
        URL.revokeObjectURL(gifPreviewUrl);
      }
    };
  }, [gifPreviewUrl]);

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
    if (!Number.isFinite(value)) {
      return minOutputSize;
    }

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

  function currentPreviewKey(width = gifWidth, height = gifHeight) {
    if (!selectedFile) {
      return "";
    }

    return JSON.stringify({
      name: selectedFile.name,
      size: selectedFile.size,
      modified: selectedFile.lastModified,
      start: clipStart,
      duration: clipDuration,
      width,
      height,
    });
  }

  function resetGifPreview() {
    if (gifPreviewUrl) {
      URL.revokeObjectURL(gifPreviewUrl);
    }
    setGifPreviewUrl("");
    setGifPreviewBlob(null);
    setGifPreviewKey("");
    setIsPreviewOpen(false);
  }

  function clearSelectedFile() {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }

    resetGifPreview();
    setSelectedFile(null);
    setVideoSrc("");
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(defaultClipDuration);
    setCurrentTime(0);
    setIsPlaying(false);
    setDefaultGifSize(16, 9);
  }

  function setGifPreview(blob: Blob, key: string) {
    if (gifPreviewUrl) {
      URL.revokeObjectURL(gifPreviewUrl);
    }

    setGifPreviewBlob(blob);
    setGifPreviewKey(key);
    setGifPreviewUrl(URL.createObjectURL(blob));
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileError = validateVideoFile(file);
    if (fileError) {
      clearSelectedFile();
      setOutputState("Video selection failed.", fileError);
      event.target.value = "";
      return;
    }

    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    resetGifPreview();

    setSelectedFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setOutputState("Video selected. Choose a clip and create a GIF preview.", "");
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(defaultClipDuration);
    setCurrentTime(0);
    setIsPlaying(false);
    setDefaultGifSize(16, 9);
  }

  function setOutputState(nextStatus: string, nextError: string) {
    setStatus(nextStatus);
    setError(nextError);
  }

  async function createGifBlob(width: number, height: number) {
    if (!selectedFile) {
      throw new Error("Select a video file first.");
    }

    return renderGif({ file: selectedFile, clipStart, clipDuration, width, height, onStatus: setStatus });
  }

  async function createGifPreview() {
    setError("");

    const validationError = validateExportSettings({ selectedFile, clipStart, clipDuration, gifWidth, gifHeight });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreatingPreview(true);
    setStatus("Creating GIF preview in your browser...");

    try {
      const previewKey = currentPreviewKey();
      const blob = await createGifBlob(gifWidth, gifHeight);
      setGifPreview(blob, previewKey);
      setIsPreviewOpen(true);
      setStatus("GIF preview created. Adjust size and download it.");
    } catch (err) {
      setStatus("Preview failed.");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingPreview(false);
    }
  }

  async function downloadGif() {
    setError("");

    const validationError = validateExportSettings({ selectedFile, clipStart, clipDuration, gifWidth, gifHeight });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsDownloading(true);
    setStatus("Preparing GIF download...");

    try {
      const previewKey = currentPreviewKey();
      const blob = gifPreviewBlob && gifPreviewKey === previewKey ? gifPreviewBlob : await createGifBlob(gifWidth, gifHeight);
      if (blob !== gifPreviewBlob) {
        setGifPreview(blob, previewKey);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = gifDownloadName(selectedFile?.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("GIF download started.");
    } catch (err) {
      setStatus("Download failed.");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace compact-workspace">
        <div className="preview-card">
          <div className="compact-title">
            <div className="title-row">
              <h1>Clip2Gif</h1>
              <a className="github-link" href="https://github.com/iamitd" target="_blank" rel="noreferrer" aria-label="Open GitHub profile">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.88c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.98c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.8c0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
              </a>
            </div>
            <span>{clipDuration > 0 ? `${formatTime(clipStart)} - ${formatTime(clipEnd)} (${clipDuration.toFixed(1)}s)` : "Select a clip"}</span>
          </div>

          <div className="video-frame">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
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
            <button className="transport-button" type="button" onClick={togglePlayback} disabled={!selectedFile} aria-label={isPlaying ? "Pause" : "Play"}>
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
                disabled={!selectedFile || isBusy}
              />
              <button
                className="range-handle end-handle"
                type="button"
                style={{ left: `${clipEndPercent}%` }}
                onPointerDown={(event) => beginHandleDrag("end", event)}
                aria-label="Move clip end"
                disabled={!selectedFile || isBusy}
              />
            </div>
            <div className="clip-actions" aria-label="Clip actions">
              <button type="button" onClick={playFromClipStart} disabled={!selectedFile} title="Play from clip start" aria-label="Play from clip start">
                ↺
              </button>
              <button type="button" onClick={setStartAtCurrentTime} disabled={!selectedFile} title="Set start to current time" aria-label="Set start to current time">
                [
              </button>
              <button type="button" onClick={setEndAtCurrentTime} disabled={!selectedFile} title="Set end to current time" aria-label="Set end to current time">
                ]
              </button>
            </div>
          </div>

          <div className="main-actions">
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,.mp4,.webm,.mov,.mkv,.avi"
              onChange={handleFileChange}
            />
            <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
              Select Video
            </button>
            <button className="primary-button" type="button" onClick={createGifPreview} disabled={isBusy || !selectedFile}>
              {isCreatingPreview ? "Creating..." : "Create GIF"}
            </button>
          </div>

          <div className="selected-file">
            <span>Selected file</span>
            <strong title={selectedFileName}>{selectedFileName}</strong>
          </div>

          <div className="status-box">
            <span>Status</span>
            <p>{status}</p>
          </div>

          {error ? <div className="error-box">{error}</div> : null}
        </div>
      </section>

      {isPreviewOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="GIF preview">
          <section className="gif-modal">
            <div className="modal-title">
              <div>
                <h2>GIF Preview</h2>
                <p>Resize the GIF, then download the final file.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsPreviewOpen(false)} disabled={isDownloading} aria-label="Close preview">
                Close
              </button>
            </div>

            <div className="gif-preview-stage">
              {gifPreviewUrl ? (
                <div className="gif-resize-frame" style={{ width: gifWidth, height: gifHeight }}>
                  <img src={gifPreviewUrl} alt="Generated GIF preview" />
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
              <button className="primary-button" type="button" onClick={downloadGif} disabled={isDownloading}>
                {isDownloading ? "Preparing..." : "Download GIF"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
