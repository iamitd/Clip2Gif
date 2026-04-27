import { describe, expect, test } from "vitest";
import { gifDownloadName, maxVideoFileSize, validateExportSettings, validateVideoFile } from "./exportValidation";

function video(overrides = {}) {
  return {
    name: "sample.mp4",
    size: 20 * 1024 * 1024,
    type: "video/mp4",
    ...overrides,
  };
}

function validSettings(overrides = {}) {
  return {
    selectedFile: video(),
    clipStart: 0,
    clipDuration: 3,
    gifWidth: 480,
    gifHeight: 270,
    ...overrides,
  };
}

describe("validateVideoFile", () => {
  test("accepts supported video files", () => {
    expect(validateVideoFile(video())).toBe("");
  });

  test("accepts supported video extensions when the browser omits the MIME type", () => {
    expect(validateVideoFile(video({ name: "clip.webm", type: "" }))).toBe("");
  });

  test("rejects unsupported files", () => {
    expect(validateVideoFile(video({ name: "notes.txt", type: "text/plain" }))).toBe("Choose a supported video file: MP4, WebM, MOV, MKV, or AVI.");
  });

  test("rejects files over the browser conversion size limit", () => {
    expect(validateVideoFile(video({ size: maxVideoFileSize + 1 }))).toBe("Choose a video up to 250 MB for browser conversion.");
  });
});

describe("validateExportSettings", () => {
  test("accepts valid export settings", () => {
    expect(validateExportSettings(validSettings())).toBe("");
  });

  test("requires a selected file", () => {
    expect(validateExportSettings(validSettings({ selectedFile: null }))).toBe("Select a video file first.");
  });

  test("rejects clips longer than the browser conversion limit", () => {
    expect(validateExportSettings(validSettings({ clipDuration: 11 }))).toBe("Clip duration must be 10 seconds or less for browser conversion.");
  });

  test("rejects output dimensions outside the allowed range", () => {
    expect(validateExportSettings(validSettings({ gifWidth: 79 }))).toBe("GIF width must be between 80 and 1280px.");
    expect(validateExportSettings(validSettings({ gifHeight: 1281 }))).toBe("GIF height must be between 80 and 1280px.");
  });

  test("rejects output pixel counts over 1280x720", () => {
    expect(validateExportSettings(validSettings({ gifWidth: 1280, gifHeight: 721 }))).toBe("GIF output must be 1280x720 pixels or smaller for browser conversion.");
  });
});

describe("gifDownloadName", () => {
  test("replaces the original extension with .gif", () => {
    expect(gifDownloadName("baby-laugh.mp4")).toBe("baby-laugh.gif");
  });

  test("falls back to clip2gif.gif when no file name is available", () => {
    expect(gifDownloadName(undefined)).toBe("clip2gif.gif");
  });
});
