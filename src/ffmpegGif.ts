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
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceWidth?: number;
  sourceHeight?: number;
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

function cropFilter(crop: RenderGifSettings["crop"], sourceWidth = 0, sourceHeight = 0) {
  if (!crop || sourceWidth <= 0 || sourceHeight <= 0) {
    return "";
  }

  const cropWidth = Math.max(2, Math.min(sourceWidth, Math.round(crop.width * sourceWidth)));
  const cropHeight = Math.max(2, Math.min(sourceHeight, Math.round(crop.height * sourceHeight)));
  const maxX = Math.max(0, sourceWidth - cropWidth);
  const maxY = Math.max(0, sourceHeight - cropHeight);
  const cropX = Math.min(maxX, Math.max(0, Math.round(crop.x * sourceWidth)));
  const cropY = Math.min(maxY, Math.max(0, Math.round(crop.y * sourceHeight)));

  if (cropX === 0 && cropY === 0 && cropWidth === sourceWidth && cropHeight === sourceHeight) {
    return "";
  }

  return `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
}

export async function renderGif({ file, clipStart, clipDuration, width, height, crop, sourceWidth, sourceHeight, onStatus }: RenderGifSettings) {
  const ffmpegInstance = await loadFFmpeg(onStatus);
  const extension = fileExtension(file.name) || "mp4";
  const inputName = `input-${Date.now()}.${extension}`;
  const outputName = `clip2gif-${Date.now()}.gif`;
  const filters = [`fps=${gifFps}`, cropFilter(crop, sourceWidth, sourceHeight), `scale=${width}:${height}:flags=lanczos`].filter(Boolean);

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
      filters.join(","),
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
