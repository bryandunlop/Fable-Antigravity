// Local, no-backend image handling for passenger photos: read a File to a base64
// data URL, downscaled to keep localStorage small. Mirrors the tech-log approach.
import type { PassengerPhoto } from './passengerData';

const MAX_DIM = 1024;

/** Read + downscale an image File to a base64 data URL. Falls back to the raw
 * data URL if canvas processing is unavailable. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(raw);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

let counter = 0;
export function makePhoto(url: string, caption: string, nowUtc: string): PassengerPhoto {
  counter += 1;
  return { id: `photo-${nowUtc}-${counter}`, url, caption: caption.trim() || undefined, addedAtUtc: nowUtc };
}
