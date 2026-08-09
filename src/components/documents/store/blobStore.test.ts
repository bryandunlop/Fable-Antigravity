import { describe, it, expect } from 'vitest';
import { memoryBlobStore, type StoredBlob } from './blobStore';
import { sha256Hex } from '../engine/hashing';

function blob(key = 'blob-1', text = 'MEL revision 15'): StoredBlob {
  return {
    key,
    bytes: new TextEncoder().encode(text).buffer as ArrayBuffer,
    mimeType: 'application/pdf',
    filename: 'D195-MEL-rev15.pdf',
  };
}

describe('BlobStore', () => {
  it('round-trips bytes unchanged — the hash must survive storage', async () => {
    const store = memoryBlobStore();
    const b = blob();
    const before = await sha256Hex(b.bytes);

    await store.put(b);
    const out = await store.get('blob-1');

    expect(out?.filename).toBe('D195-MEL-rev15.pdf');
    expect(await sha256Hex(out!.bytes)).toBe(before);
  });

  it('resolves undefined for a missing key rather than throwing', async () => {
    // A blob the browser evicted must degrade to "fetch it again", not to a
    // crash on the ramp when someone opens the MEL.
    await expect(memoryBlobStore().get('never-stored')).resolves.toBeUndefined();
  });

  it('lists and deletes keys', async () => {
    const store = memoryBlobStore();
    await store.put(blob('a'));
    await store.put(blob('b'));
    expect((await store.keys()).sort()).toEqual(['a', 'b']);

    await store.delete('a');
    expect(await store.keys()).toEqual(['b']);
    expect(await store.get('a')).toBeUndefined();
  });
});
