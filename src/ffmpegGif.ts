import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { fileExtension } from "./exportValidation";

const ffmpegCoreBaseUrl = "/ffmpeg";
const gifFps = 15;

let ffmpeg: FFmpeg | null = null;

export type RenderGifSettings = {
  file: File;
  clipStart: number;
  clipDuration: number;
  width: number;
  height: number;
  onStatus?: (status: string) => void;
};

async function loadFFmpeg(onStatus?: (status: string) => void) {
  if (ffmpeg?.loaded) {
    return ffmpeg;
  }

  const nextFFmpeg = new FFmpeg();
  nextFFmpeg.on("log", ({ message }) => {
    if (message.includes("time=")) {
      onStatus?.("Converting video to GIF...");
    }
  });

  onStatus?.("Loading FFmpeg WebAssembly...");
  await nextFFmpeg.load({
    coreURL: await toBlobURL(`${ffmpegCoreBaseUrl}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${ffmpegCoreBaseUrl}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpeg = nextFFmpeg;
  return nextFFmpeg;
}

export async function renderGif({ file, clipStart, clipDuration, width, height, onStatus }: RenderGifSettings) {
  const ffmpegInstance = await loadFFmpeg(onStatus);
  const extension = fileExtension(file.name) || "mp4";
  const inputName = `input-${Date.now()}.${extension}`;
  const outputName = `clip2gif-${Date.now()}.gif`;

  try {
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));
    const exitCode = await ffmpegInstance.exec([
      "-ss",
      clipStart.toString(),
      "-t",
      clipDuration.toString(),
      "-i",
      inputName,
      "-vf",
      `fps=${gifFps},scale=${width}:${height}:flags=lanczos`,
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg failed with exit code ${exitCode}.`);
    }

    const data = await ffmpegInstance.readFile(outputName);
    return new Blob([data as BlobPart], { type: "image/gif" });
  } finally {
    await Promise.allSettled([ffmpegInstance.deleteFile(inputName), ffmpegInstance.deleteFile(outputName)]);
  }
}
