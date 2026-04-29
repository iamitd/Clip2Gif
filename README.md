# Clip2Gif

Create GIFs from short video clips directly in your browser.

[Live Demo](https://clip2-gif.vercel.app/)

![Clip2Gif app screenshot](docs/screenshot.png)

## Features

- Select a local video file.
- Preview the selected video before converting.
- Pick a short clip with timeline controls.
- Generate a GIF preview in the browser.
- Resize the GIF output before download.
- Download the final GIF.
- Convert locally without uploading videos to a server.

## Privacy

Clip2Gif uses FFmpeg WebAssembly in the browser. Your selected video stays on your device and is not uploaded to a backend service.

## MVP Limits

Browser-based video conversion is intentionally bounded to keep the app responsive:

- Input file size: up to 250 MB.
- Clip duration: up to 10 seconds.
- Output width and height: 80-1280 px.
- Output pixel budget: up to 1280x720.
- Supported formats: MP4, WebM, MOV, MKV, AVI.

## Tech Stack

- React
- TypeScript
- Vite
- FFmpeg WebAssembly
- Vitest
- Vercel

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run checks:

```bash
npm test
npm run typecheck
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Clip2Gif is deployed as a static Vite app on Vercel.

Vercel settings:

- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

No environment variables are required for the MVP.

## FFmpeg Assets

FFmpeg core assets are served from `public/ffmpeg/`.

`ffmpeg-core.js` must be the ESM build from `@ffmpeg/core/dist/esm`. The UMD build does not work with Vite's module worker path and can fail with `failed to import ffmpeg-core.js`.

## Known Limitations

- The first conversion can take a few seconds while FFmpeg WebAssembly loads.
- Conversion speed depends on the browser, device, input video, clip length, and output size.
- The MVP uses a simple `fps,scale` FFmpeg pipeline.
- There is no server-side fallback.

## Author

Built by [iamitd](https://github.com/iamitd).
