// The one received document the demo ships with real bytes.
//
// A seeded SHA-256 that hashes nothing would be exactly the failure this feature
// must not have: a digest on screen labelled "computed by myGFO" that no file
// backs. So the seed carries an actual (tiny) PDF, and `MEL_DEMO_SHA256` is the
// true digest of these exact bytes — pinned by demoSeedBlob.test.ts, which
// recomputes it rather than trusting the constant.
import { idbBlobStore } from './blobStore';

export const MEL_DEMO_BLOB_KEY = 'RCV-001-demo';
export const MEL_DEMO_FILENAME = 'D195-MEL-rev15.pdf';

/** A minimal one-page PDF. Deliberately legible as source, so nothing here is opaque. */
export const MEL_DEMO_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 118>>stream
BT /F1 16 Tf 72 700 Td (D195 Master Minimum Equipment List) Tj 0 -28 Td /F1 11 Tf (Revision 15 - DEMO SEED) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

export function melDemoBytes(): ArrayBuffer {
  return new TextEncoder().encode(MEL_DEMO_PDF).buffer as ArrayBuffer;
}

export const MEL_DEMO_BYTE_LENGTH = new TextEncoder().encode(MEL_DEMO_PDF).length;

/** SHA-256 of MEL_DEMO_PDF. Verified against a fresh computation in the tests. */
export const MEL_DEMO_SHA256 = '9cd6b1cad648d920d8460e0ad334dac861292739c9d945e0f8a0f3bde87f39b8';

/** Put the demo bytes in the blob store if they are not already there, so the
 *  seeded received document actually opens and reads offline. */
export async function ensureDemoBlob(): Promise<void> {
  try {
    if (await idbBlobStore.get(MEL_DEMO_BLOB_KEY)) return;
    await idbBlobStore.put({
      key: MEL_DEMO_BLOB_KEY,
      bytes: melDemoBytes(),
      mimeType: 'application/pdf',
      filename: MEL_DEMO_FILENAME,
    });
  } catch {
    /* no IndexedDB (tests, SSR) — the reader degrades to "fetch it again" */
  }
}
