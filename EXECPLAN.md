# Clip2Gif MVP ExecPlan

## Purpose / Big Picture

Clip2Gif is a Windows desktop application that turns a selected video file into a GIF. The MVP lets the user select a video, preview it, enter start time, duration, width, and FPS, then create a GIF next to the input file using FFmpeg.

## Progress

- [x] Confirmed existing project directory is empty: `C:\Users\Slava\Desktop\NEW ERA\Clip2Gif`.
- [x] Confirmed Node.js and npm are available.
- [x] Confirmed Rust/Cargo are not currently available in `PATH`.
- [x] Confirmed FFmpeg is not currently available in `PATH`.
- [x] Create project-level `AGENTS.md`.
- [x] Create minimal Tauri + React + TypeScript project files.
- [x] Implement React MVP UI.
- [x] Implement Rust command that invokes FFmpeg.
- [x] Run available validation.
- [x] Record final validation results and blockers.

## Surprises & Discoveries

- `rustc` and `cargo` are not installed or not available in `PATH`, so Tauri desktop build/dev validation may be blocked until Rust is installed.
- `ffmpeg` is not installed or not available in `PATH`, so GIF export manual validation may be blocked until FFmpeg is installed.

## Decision Log

- Decision: Use the existing empty `Clip2Gif` directory as the project root.
  Rationale: The requested project directory already exists and contains no files.
  Date/Author: 2026-04-24 / user

- Decision: Save GIF files next to the source video.
  Rationale: This avoids a save dialog for the MVP and keeps the workflow minimal.
  Date/Author: 2026-04-24 / user

- Decision: Invoke `ffmpeg` from `PATH`.
  Rationale: Development can require FFmpeg in the system environment; bundling is a later release task.
  Date/Author: 2026-04-24 / user

- Decision: Use one-step FFmpeg output for MVP.
  Rationale: The palette workflow improves quality but is not required for the first working version.
  Date/Author: 2026-04-24 / agent

## Outcomes & Retrospective

The MVP code has been created. Frontend production build succeeds. Tauri environment detection succeeds far enough to confirm WebView2 and MSVC are available, but Rust/rustup/Cargo are missing, so desktop dev/build cannot be completed in this environment yet. FFmpeg is also missing from `PATH`, so manual GIF export validation is blocked until FFmpeg is installed.

## Context and Orientation

The app has two main parts:

- Frontend React UI in `src/`.
- Tauri Rust backend in `src-tauri/`.

The frontend opens a file picker, displays the selected video in a native HTML `<video>` element, gathers export settings, and invokes the backend command. The backend validates settings and runs FFmpeg.

## Plan of Work

Create the smallest viable Tauri v2 application manually. Keep UI and backend logic direct and easy to inspect. Avoid extra libraries beyond Tauri, React, TypeScript, and Vite.

## Concrete Steps

1. Create npm, Vite, TypeScript, and Tauri config files.
2. Add React entry files and CSS.
3. Add Tauri Rust crate files.
4. Implement `create_gif` command in Rust.
5. Install npm dependencies.
6. Run `npm run build`.
7. Attempt Tauri validation if Rust/Cargo are installed.

## Validation and Acceptance

Expected validation:

- `npm install` completes.
- `npm run build` completes and emits frontend assets.
- `npm run tauri dev` starts the desktop app when Rust/Cargo are available.
- With FFmpeg in `PATH`, choosing a video and clicking Create GIF creates a `.gif` next to the input video.
- Without FFmpeg in `PATH`, the UI shows a clear error.

## Idempotence and Recovery

The file creation steps are safe because the project directory started empty. Dependency installation can be repeated with `npm install`. If Rust is missing, install Rust with rustup and rerun Tauri commands. If FFmpeg is missing, install FFmpeg and ensure `ffmpeg` is available in `PATH`.

## Artifacts and Notes

- `npm install`: completed successfully with 0 vulnerabilities.
- `npm run build`: completed successfully and emitted `dist/` assets.
- `npm run tauri -- info`: project detected; WebView2 and MSVC available; Rust/rustup/Cargo missing.
- `ffmpeg -version`: command not found before implementation; export validation requires installing FFmpeg or adding it to `PATH`.
