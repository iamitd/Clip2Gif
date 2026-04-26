# Clip2Gif Web MVP ExecPlan

## Purpose / Big Picture

Clip2Gif is now a browser-based web application planned for Vercel hosting. Users select a local video file, choose a clip range in the browser, generate a GIF preview with FFmpeg WebAssembly, adjust output dimensions, and download the final GIF. Video files are not uploaded to a server.

## Progress

- [x] Converted project direction from Windows desktop app to web app.
- [x] Removed Tauri/Rust desktop layer.
- [x] Replaced Tauri file picker with browser file input.
- [x] Replaced backend FFmpeg command with FFmpeg WebAssembly in the browser.
- [x] Preserved video preview, draggable clip range, GIF preview modal, and resize controls.
- [x] Replaced save-to-neighboring-file behavior with browser download.
- [x] Updated npm dependencies and scripts for Vite/Vercel.
- [x] Ran `npm install`.
- [x] Ran `npm run build` successfully.

## Surprises & Discoveries

- Browser hosting cannot save a GIF next to the source video in a normal cross-browser way, so the web MVP uses a standard file download.
- FFmpeg WebAssembly is loaded in the browser from the `@ffmpeg/core` CDN path. This keeps the Vercel app static but means first conversion needs to download the FFmpeg core assets.

## Decision Log

- Decision: Convert Clip2Gif from Tauri desktop to a Vite/React web app.
  Rationale: The product direction changed to a site that can be hosted on Vercel.
  Date/Author: 2026-04-26 / user

- Decision: Run conversion locally in the browser with FFmpeg WebAssembly.
  Rationale: This avoids server uploads, keeps user videos private, and fits static Vercel hosting.
  Date/Author: 2026-04-26 / user

- Decision: Remove the Tauri/Rust desktop layer instead of keeping it beside the web app.
  Rationale: The user no longer wants the desktop version and asked to replace it with the website.
  Date/Author: 2026-04-26 / user

- Decision: Use browser download for the final GIF.
  Rationale: Web apps cannot reliably save next to the original file without browser-specific file system APIs.
  Date/Author: 2026-04-26 / agent

## Outcomes & Retrospective

The app is now a web-only MVP. The build succeeds with Vite and is ready for local browser testing and later Vercel deployment. Manual validation still needs a real video file in the browser because FFmpeg WebAssembly behavior depends on browser runtime and available memory.

## Context and Orientation

Relevant files:

- `src/App.tsx`: browser file selection, video preview, timeline selection, FFmpeg WebAssembly conversion, GIF preview modal, and download flow.
- `src/App.css`: compact responsive UI and GIF preview modal styles.
- `package.json`: Vite/React scripts and FFmpeg WebAssembly dependencies.
- `AGENTS.md`: project-level instructions updated for the web MVP.

No backend, database, Tauri, Rust, or server upload path exists in the current MVP.

## Plan of Work

Continue with browser validation, then deploy to Vercel as a static Vite app. If the FFmpeg CDN approach is not acceptable later, copy FFmpeg core assets into the app's public assets and load them locally from Vercel.

## Concrete Steps

Run from the project root:

1. `npm install`
2. `npm run build`
3. `npm run dev`
4. Open the local Vite URL in a browser.
5. Select a short video, choose a clip, create a GIF, resize it, and download it.

## Validation and Acceptance

The web MVP is accepted when:

- `npm run build` succeeds.
- The site opens via `npm run dev`.
- A user can select a local video file.
- The video preview and draggable clip range work.
- `Create GIF` loads FFmpeg WebAssembly and opens a GIF preview modal.
- Width/height edits and resize handle update the preview frame.
- `Download GIF` downloads a `.gif` file.

## Idempotence and Recovery

Dependency installation can be repeated with `npm install`. If FFmpeg WebAssembly fails to load, check browser console/network requests for the `@ffmpeg/core` assets. If large files fail, retry with a shorter/smaller video; browser memory is the main practical constraint for the MVP.

## Artifacts and Notes

- `npm install`: completed after replacing Tauri dependencies with FFmpeg WebAssembly packages.
- `npm run build`: completed successfully after conversion to web-only.
