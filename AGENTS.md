# Project Agent Instructions

## Project Overview

Project name: Clip2Gif

Purpose: Windows desktop application for creating GIF files from short video clips.

## Tech Stack

Status: Planned and initialized for MVP.

- Frontend: React + TypeScript
- Backend: Rust via Tauri commands
- Desktop/runtime: Tauri, Windows only
- Database: None
- Build tools: Vite, Cargo, Tauri CLI
- Testing: TypeScript build checks; manual desktop export validation for MVP
- Package manager: npm

## Key Commands

Use these commands from the project root.

- Install dependencies: `npm install`
- Start development: `npm run tauri dev`
- Build frontend: `npm run build`
- Build desktop app: `npm run tauri build`
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
- Keep the MVP Windows-only unless the project requirements change.
- Use FFmpeg as an external CLI dependency for development; do not bundle `ffmpeg.exe` until a release packaging milestone requires it.

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
- `npm run tauri dev` when Rust/Cargo are available
- Manual export of a short video to GIF when FFmpeg is available in `PATH`

## Planning Rules

For complex features, architecture decisions, significant refactors, or multi-hour tasks, use an ExecPlan.

Use the global ExecPlan standard unless this project defines its own `PLANS.md`.

Global standard:
`C:\Users\Slava\.config\opencode\PLANS.md`

## Decisions

- Decision: Build the MVP with Tauri, React, TypeScript, and Rust.
  Rationale: Tauri provides a lightweight Windows desktop shell, React/TypeScript keeps UI implementation fast, and Rust backend can safely invoke FFmpeg.
  Date/Author: 2026-04-24 / agent

- Decision: Require FFmpeg to be installed in `PATH` for development.
  Rationale: Bundling `ffmpeg.exe` is deferred until release packaging; MVP only needs a clear error when FFmpeg is unavailable.
  Date/Author: 2026-04-24 / agent

- Decision: Save generated GIFs next to the source video.
  Rationale: This keeps the MVP UI minimal and avoids an extra save dialog flow.
  Date/Author: 2026-04-24 / user

- Decision: Use a single-step FFmpeg command for MVP quality.
  Rationale: `fps,scale` is enough for the first working product; `palettegen/paletteuse` can be added later.
  Date/Author: 2026-04-24 / agent
