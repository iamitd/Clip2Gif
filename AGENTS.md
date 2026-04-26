# Project Agent Instructions

## Project Overview

Project name: Clip2Gif

Purpose: Web application for creating GIF files from short video clips in the browser.

## Tech Stack

Status: Converted from desktop MVP to web MVP planned for Vercel hosting.

- Frontend: React + TypeScript
- Backend: None for MVP; conversion runs in the browser via FFmpeg WebAssembly
- Desktop/runtime: Web browser; target hosting is Vercel
- Database: None
- Build tools: Vite
- Testing: TypeScript build checks; manual browser GIF export validation for MVP
- Package manager: npm

## Key Commands

Use these commands from the project root.

- Install dependencies: `npm install`
- Start development: `npm run dev`
- Build frontend: `npm run build`
- Preview production build: `npm run preview`
- Test: TBD
- Lint: TBD
- Format: TBD

If a command is unknown, inspect project files before guessing.

## Code Rules

- Prefer small, focused changes.
- Preserve existing project style.
- Do not add dependencies unless there is a clear reason.
- Keep implementation minimal for the current milestone.
- Avoid backward-compatibility code unless there is a concrete need.
- Use clear names and avoid unnecessary abstractions.
- Add comments only when code is not self-explanatory.
- Keep video processing local to the user's browser unless project requirements change.
- Do not add a server upload/conversion backend unless explicitly requested.

## Self-Check Instructions

Before considering work complete:

- Run the most relevant available checks.
- Prefer tests, build, lint, or typecheck when available.
- If checks cannot be run, explain why.
- Manually verify user-visible behavior when possible.
- Report changed files and validation results.

For this MVP, minimum validation is:

- `npm install`
- `npm run build`
- `npm run dev`
- Manual export/download of a short video to GIF in a browser

## Planning Rules

For complex features, architecture decisions, significant refactors, or multi-hour tasks, use an ExecPlan.

Use the global ExecPlan standard unless this project defines its own `PLANS.md`.

Global standard:
`C:\Users\Slava\.config\opencode\PLANS.md`

## Decisions

- Decision: Build the original MVP with Tauri, React, TypeScript, and Rust. Superseded by the web-app decision below.
  Rationale: Tauri provides a lightweight Windows desktop shell, React/TypeScript keeps UI implementation fast, and Rust backend can safely invoke FFmpeg.
  Date/Author: 2026-04-24 / agent

- Decision: Require FFmpeg to be installed in `PATH` for desktop development. Superseded by browser FFmpeg WebAssembly.
  Rationale: Bundling `ffmpeg.exe` is deferred until release packaging; MVP only needs a clear error when FFmpeg is unavailable.
  Date/Author: 2026-04-24 / agent

- Decision: Save generated GIFs next to the source video for desktop MVP. Superseded by browser download for the web MVP.
  Rationale: This keeps the MVP UI minimal and avoids an extra save dialog flow.
  Date/Author: 2026-04-24 / user

- Decision: Use a single-step FFmpeg command for MVP quality.
  Rationale: `fps,scale` is enough for the first working product; `palettegen/paletteuse` can be added later.
  Date/Author: 2026-04-24 / agent

- Decision: Convert Clip2Gif from desktop to a web app for Vercel.
  Rationale: The project direction changed from a Windows desktop app to a hosted website.
  Date/Author: 2026-04-26 / user

- Decision: Run video-to-GIF conversion in the browser with FFmpeg WebAssembly.
  Rationale: This avoids uploading user videos to a server and fits static Vercel hosting better than server-side FFmpeg functions.
  Date/Author: 2026-04-26 / user
