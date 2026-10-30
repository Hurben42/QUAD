/**
 * The coin's image, prepared in the browser: a square crop resized to IMAGE_SIDE px and encoded
 * (WebP, or JPEG where the browser cannot encode WebP) until it fits under IMAGE_MAX_BYTES, so the
 * upload to Irys stays under its free 100 KiB. Returns a data URL for /api/metadata.
 */
export const IMAGE_SIDE = 512;
export const IMAGE_MAX_BYTES = 95 * 1024;

export const dataUrlBytes = (url: string) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);

export async function imageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  const square = Math.min(bitmap.width, bitmap.height);
  for (const side of [IMAGE_SIDE, 384, 256]) {
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot resize images.');
    ctx.drawImage(bitmap, (bitmap.width - square) / 2, (bitmap.height - square) / 2, square, square, 0, 0, side, side);
    for (const type of ['image/webp', 'image/jpeg']) {
      for (const quality of [0.9, 0.8, 0.7, 0.6]) {
        const url = canvas.toDataURL(type, quality);
        if (!url.startsWith(`data:${type}`)) break; // the browser cannot encode this type
        if (dataUrlBytes(url) <= IMAGE_MAX_BYTES) return url;
      }
    }
  }
  throw new Error('This image cannot be made small enough. Try a simpler one.');
}
