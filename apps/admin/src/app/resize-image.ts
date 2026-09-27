const OUTPUT_TYPE = 'image/webp';
const OUTPUT_EXTENSION = '.webp';
const OUTPUT_QUALITY = 0.82;
/** Plenty for a full-screen photo on the website; camera originals are several times that. */
export const PHOTO_MAX_SIZE = 2048;

function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded'))),
      OUTPUT_TYPE,
      OUTPUT_QUALITY
    );
  });
}

/**
 * The photo scaled down so its longer side is at most `maxSize` pixels (never up), as WebP. The
 * website shows photos as they were uploaded, so this is what keeps it fast.
 */
export async function resizePhoto(photo: File, maxSize = PHOTO_MAX_SIZE): Promise<File> {
  const bitmap = await createImageBitmap(photo);
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Drawing on a canvas is not available');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await encode(canvas);
    const name = photo.name.replace(/\.[^.]*$/, '') + OUTPUT_EXTENSION;
    return new File([blob], name, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
