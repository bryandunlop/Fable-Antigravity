// Turning what a person drops, pastes or picks into something we can store.
//
// The whole file exists because of one number: localStorage gives us ~5 MB for
// the ENTIRE demo, and a MacBook screenshot is 2–5 MB on its own. Storing a raw
// screenshot would blow the quota, and the store's quota catch would then eat the
// report the screenshot was attached to. So every image is downscaled and
// re-encoded before it is ever written.

export const MAX_ATTACHMENTS = 3;
/** Longest edge after downscale. 1600 keeps UI text legible in a screenshot. */
export const MAX_EDGE_PX = 1600;
/** Refuse anything above this BEFORE decoding it — a 60 MB TIFF is not a mistake worth loading. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const JPEG_QUALITY = 0.82;

export type RejectionReason = 'not-an-image' | 'too-large' | 'too-many';

export interface Rejection {
  name: string;
  reason: RejectionReason;
}

export function describeRejection(rejection: Rejection): string {
  switch (rejection.reason) {
    case 'not-an-image':
      return `${rejection.name} is not an image.`;
    case 'too-large':
      return `${rejection.name} is over 25 MB.`;
    case 'too-many':
      return `Only ${MAX_ATTACHMENTS} screenshots per report — ${rejection.name} was not added.`;
  }
}

/**
 * Decide which candidates are allowed in, given how many are already attached.
 * Pure and synchronous so the rules are testable without a DOM: the actual
 * decoding happens in readImageFile below.
 */
export function selectAcceptable(
  candidates: { name: string; type: string; size: number }[],
  alreadyAttached: number,
): { accepted: number[]; rejected: Rejection[] } {
  const accepted: number[] = [];
  const rejected: Rejection[] = [];
  let room = MAX_ATTACHMENTS - alreadyAttached;

  candidates.forEach((file, index) => {
    const name = file.name || 'Pasted image';
    if (!file.type.startsWith('image/')) {
      rejected.push({ name, reason: 'not-an-image' });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      rejected.push({ name, reason: 'too-large' });
      return;
    }
    if (room <= 0) {
      rejected.push({ name, reason: 'too-many' });
      return;
    }
    room -= 1;
    accepted.push(index);
  });

  return { accepted, rejected };
}

/** Target dimensions for a downscale. Never upscales a small image. */
export function scaledSize(
  width: number,
  height: number,
  maxEdge = MAX_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/** Bytes carried by a data URL, from its base64 payload. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function attachmentFileName(name: string, index: number): string {
  const trimmed = (name || '').trim();
  if (trimmed) return trimmed.replace(/\.(png|jpe?g|webp|gif|heic)$/i, '') + '.jpg';
  // Pasted clipboard images arrive with an empty name; Jira shows the filename,
  // so "image.png" four times over is worse than nothing.
  return `screenshot-${index + 1}.jpg`;
}

/**
 * Decode, downscale and re-encode one image file. Browser-only (canvas), so it
 * is kept apart from the pure rules above and is not unit-tested — the parts
 * worth testing are.
 */
export function readImageFile(file: File, index: number): Promise<{
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name || 'the image'}.`));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(`${file.name || 'That file'} is not a readable image.`));
      image.onload = () => {
        const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('This browser could not process the image.'));
          return;
        }
        // Screenshots are usually opaque; a white ground stops a transparent PNG
        // turning black when it is re-encoded as JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({
          name: attachmentFileName(file.name, index),
          mimeType: 'image/jpeg',
          size: dataUrlBytes(dataUrl),
          dataUrl,
        });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
