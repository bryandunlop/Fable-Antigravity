import { describe, it, expect } from 'vitest';
import {
  selectAcceptable,
  scaledSize,
  dataUrlBytes,
  attachmentFileName,
  describeRejection,
  formatBytes,
  MAX_ATTACHMENTS,
  MAX_EDGE_PX,
} from './attachments';

const png = (name: string, size = 1024) => ({ name, type: 'image/png', size });

describe('selectAcceptable', () => {
  it('accepts images and rejects anything that is not one', () => {
    const { accepted, rejected } = selectAcceptable(
      [png('a.png'), { name: 'notes.pdf', type: 'application/pdf', size: 10 }],
      0,
    );
    expect(accepted).toEqual([0]);
    expect(rejected).toEqual([{ name: 'notes.pdf', reason: 'not-an-image' }]);
  });

  it('rejects an oversized source before anything tries to decode it', () => {
    const { accepted, rejected } = selectAcceptable([png('huge.png', 40 * 1024 * 1024)], 0);
    expect(accepted).toEqual([]);
    expect(rejected[0].reason).toBe('too-large');
  });

  it('honours the cap, counting what is already attached', () => {
    const { accepted, rejected } = selectAcceptable([png('a.png'), png('b.png')], MAX_ATTACHMENTS - 1);
    expect(accepted).toEqual([0]);
    expect(rejected).toEqual([{ name: 'b.png', reason: 'too-many' }]);
  });

  it('does not let a rejected file consume a slot', () => {
    const { accepted } = selectAcceptable(
      [{ name: 'x.pdf', type: 'application/pdf', size: 1 }, png('a.png'), png('b.png'), png('c.png')],
      0,
    );
    expect(accepted).toEqual([1, 2, 3]);
  });

  it('names a clipboard paste rather than showing an empty rejection', () => {
    const { rejected } = selectAcceptable([{ name: '', type: 'text/plain', size: 4 }], 0);
    expect(rejected[0].name).toBe('Pasted image');
    expect(describeRejection(rejected[0])).toContain('not an image');
  });
});

describe('scaledSize', () => {
  it('leaves an already-small image alone rather than upscaling it', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest edge down and preserves the aspect ratio', () => {
    expect(scaledSize(3200, 2000)).toEqual({ width: MAX_EDGE_PX, height: 1000 });
    expect(scaledSize(1000, 4000)).toEqual({ width: 400, height: MAX_EDGE_PX });
  });
});

describe('dataUrlBytes', () => {
  it('reports the decoded size, not the base64 length', () => {
    // "hello" is 5 bytes; its base64 is 8 characters with one '=' pad.
    expect(dataUrlBytes('data:image/jpeg;base64,aGVsbG8=')).toBe(5);
  });
});

describe('attachmentFileName', () => {
  it('re-extensions a converted image', () => {
    expect(attachmentFileName('Screenshot 2026-09-02.png', 0)).toBe('Screenshot 2026-09-02.jpg');
  });

  it('gives an unnamed clipboard paste a distinct name per slot', () => {
    expect(attachmentFileName('', 0)).toBe('screenshot-1.jpg');
    expect(attachmentFileName('', 2)).toBe('screenshot-3.jpg');
  });
});

describe('formatBytes', () => {
  it('reads at human scale', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
