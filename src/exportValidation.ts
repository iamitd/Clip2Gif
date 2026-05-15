export const minOutputSize = 80;
export const maxOutputSize = 1280;
export const maxOutputPixels = 1280 * 720;
export const maxClipDuration = 10;
export const maxVideoFileSizeMb = 250;
export const maxVideoFileSize = maxVideoFileSizeMb * 1024 * 1024;

const supportedVideoExtensions = new Set(["mp4", "webm", "mov", "mkv", "avi"]);

export type VideoFileLike = {
  name: string;
  size: number;
  type: string;
};

export type ExportSettings = {
  selectedFile: VideoFileLike | null;
  clipStart: number;
  clipDuration: number;
  gifWidth: number;
  gifHeight: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedVideo(file: VideoFileLike) {
  return file.type.startsWith("video/") || supportedVideoExtensions.has(fileExtension(file.name));
}

export function validateVideoFile(file: VideoFileLike) {
  if (!isSupportedVideo(file)) {
    return "Choose a supported video file: MP4, WebM, MOV, MKV, or AVI.";
  }

  if (file.size > maxVideoFileSize) {
    return `Choose a video up to ${maxVideoFileSizeMb} MB for browser conversion.`;
  }

  return "";
}

export function validateExportSettings({ selectedFile, clipStart, clipDuration, gifWidth, gifHeight, crop }: ExportSettings) {
  if (!selectedFile) {
    return "Select a video file first.";
  }

  const fileError = validateVideoFile(selectedFile);
  if (fileError) {
    return fileError;
  }

  if (!Number.isFinite(clipStart) || clipStart < 0) {
    return "Clip start must be 0 or greater.";
  }

  if (!Number.isFinite(clipDuration) || clipDuration <= 0) {
    return "Clip duration must be greater than 0.";
  }

  if (clipDuration > maxClipDuration) {
    return `Clip duration must be ${maxClipDuration} seconds or less for browser conversion.`;
  }

  if (!Number.isInteger(gifWidth) || gifWidth < minOutputSize || gifWidth > maxOutputSize) {
    return `GIF width must be between ${minOutputSize} and ${maxOutputSize}px.`;
  }

  if (!Number.isInteger(gifHeight) || gifHeight < minOutputSize || gifHeight > maxOutputSize) {
    return `GIF height must be between ${minOutputSize} and ${maxOutputSize}px.`;
  }

  if (gifWidth * gifHeight > maxOutputPixels) {
    return "GIF output must be 1280x720 pixels or smaller for browser conversion.";
  }

  if (crop) {
    const cropValues = [crop.x, crop.y, crop.width, crop.height];
    if (cropValues.some((value) => !Number.isFinite(value))) {
      return "Crop area must use valid numeric values.";
    }

    if (crop.width <= 0 || crop.height <= 0) {
      return "Crop area must have a width and height.";
    }

    if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > 1 || crop.y + crop.height > 1) {
      return "Crop area must stay inside the video frame.";
    }
  }

  return "";
}

export function gifDownloadName(fileName: string | undefined) {
  return `${fileName?.replace(/\.[^.]+$/, "") || "clip2gif"}.gif`;
}
