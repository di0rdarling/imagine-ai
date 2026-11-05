const DEFAULT_MAX_DIMENSION = 512;
const DEFAULT_JPEG_QUALITY = 0.82;
/** Target encoded size well under the server action limit (with form overhead). */
const DEFAULT_MAX_OUTPUT_BYTES = 400_000;

export type ResizeImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxOutputBytes?: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Downscales and re-encodes an image for avatar upload so Server Action payloads stay small.
 */
export async function readImageAsCompressedDataUrl(
  file: File,
  options: ResizeImageOptions = {},
): Promise<string> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_DIMENSION;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_DIMENSION;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const img = await loadImageFromFile(file);

  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image in this browser.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = options.quality ?? DEFAULT_JPEG_QUALITY;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (blob && blob.size > maxOutputBytes && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob) {
    throw new Error("Could not encode image.");
  }

  if (blob.size > maxOutputBytes) {
    throw new Error(
      "Image is still too large after compression. Try a smaller photo or crop it first.",
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read encoded image."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read encoded image."));
    reader.readAsDataURL(blob);
  });
}
