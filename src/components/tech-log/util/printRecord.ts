// Human-readable WORM rendering of a signed record (§3.1 pdf_blob_uri, §17.6).
// In production this is a server-generated PDF written to immutable Blob; for the demo we render a
// styled, printable HTML document in a new window and let the browser print/"Save as PDF".

export interface PrintField {
  label: string;
  value: string;
}

export interface PrintSignature {
  role: string;
  name: string;
  cert?: string;
  hash: string;
  signedAtUtc: string;
  amr?: string;
}

export interface PrintSection {
  heading: string;
  fields?: PrintField[];
  body?: string;
}

export interface PrintRecordInput {
  docTitle: string;
  recordType: string;
  reference: string;
  aircraft?: string;
  sections: PrintSection[];
  signatures: PrintSignature[];
  pdfBlobUri: string;
  recordOrigin?: string;
  footnote?: string;
}

/** Deterministic mock WORM blob URI for a signed record. */
export function mockPdfBlobUri(kind: string, id: string): string {
  return `blob://mygfo-worm/${kind}/${id}.pdf`;
}

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function printSignedRecord(input: PrintRecordInput): void {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) {
    // popup blocked — surface via the caller's toast path is not available here; no-op safe fallback.
    return;
  }

  const sectionsHtml = input.sections
    .map(s => {
      const fields = (s.fields ?? [])
        .map(f => `<div class="f"><span class="l">${esc(f.label)}</span><span class="v">${esc(f.value)}</span></div>`)
        .join('');
      const body = s.body ? `<p class="body">${esc(s.body)}</p>` : '';
      return `<section><h2>${esc(s.heading)}</h2><div class="grid">${fields}</div>${body}</section>`;
    })
    .join('');

  const sigsHtml = input.signatures
    .map(
      sig => `
      <div class="sig">
        <div class="sig-line">${esc(sig.name)}${sig.cert ? ` &middot; ${esc(sig.cert)}` : ''}</div>
        <div class="sig-role">${esc(sig.role)}</div>
        <div class="sig-meta">Signed ${esc(new Date(sig.signedAtUtc).toLocaleString())}${sig.amr ? ` &middot; ${esc(sig.amr)}` : ''}</div>
        <div class="sig-hash">SHA-256 (mock): ${esc(sig.hash)}</div>
      </div>`,
    )
    .join('');

  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(input.docTitle)} — ${esc(input.reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 32px 40px; }
  .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #00205B; padding-bottom: 12px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color:#00205B; }
  .brand small { display:block; font-weight:600; font-size:11px; color:#555; letter-spacing:0.04em; text-transform:uppercase; }
  .doctype { text-align:right; font-size:11px; color:#555; }
  .doctype .badge { display:inline-block; border:1px solid #00205B; color:#00205B; border-radius:4px; padding:2px 8px; font-weight:700; font-size:10px; text-transform:uppercase; }
  h1 { font-size: 22px; margin: 20px 0 4px; }
  .ref { color:#555; font-size:12px; margin-bottom:18px; }
  section { margin: 16px 0; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color:#00205B; border-bottom:1px solid #ddd; padding-bottom:4px; margin:0 0 8px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .f { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; border-bottom:1px dotted #eee; }
  .l { color:#666; } .v { font-weight:600; text-align:right; }
  .body { font-size:13px; line-height:1.5; white-space:pre-wrap; }
  .sigs { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:8px; }
  .sig { border:1px solid #ccc; border-radius:6px; padding:10px 12px; }
  .sig-line { font-weight:700; font-size:14px; }
  .sig-role { font-size:12px; color:#555; }
  .sig-meta { font-size:11px; color:#777; margin-top:6px; }
  .sig-hash { font-family: ui-monospace, Menlo, monospace; font-size:10px; color:#999; margin-top:4px; word-break:break-all; }
  .worm { margin-top:24px; border-top:1px solid #ddd; padding-top:10px; font-size:10px; color:#888; }
  .worm code { font-family: ui-monospace, Menlo, monospace; }
  @media print { body { padding: 0; } .noprint { display:none; } }
  .noprint { margin-bottom:16px; }
  button { font-size:13px; padding:8px 16px; border-radius:6px; border:1px solid #00205B; background:#00205B; color:#fff; cursor:pointer; }
</style></head>
<body>
  <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="hd">
    <div class="brand">myGFO<small>P&amp;G Global Flight Operations &middot; eTechLog</small></div>
    <div class="doctype"><span class="badge">${esc(input.recordType)}</span><div style="margin-top:6px">${input.aircraft ? esc(input.aircraft) : ''}</div></div>
  </div>
  <h1>${esc(input.docTitle)}</h1>
  <div class="ref">Reference ${esc(input.reference)}${input.recordOrigin ? ` &middot; origin: ${esc(input.recordOrigin)}` : ''}</div>
  ${sectionsHtml}
  <section><h2>Electronic signature(s) — AC 120-78B</h2><div class="sigs">${sigsHtml}</div></section>
  <div class="worm">
    This is a human-readable rendering of a signed, append-only record. The authoritative record is the
    cryptographic spine in the myGFO ledger. WORM artifact: <code>${esc(input.pdfBlobUri)}</code>.
    ${input.footnote ? `<br/>${esc(input.footnote)}` : ''}
  </div>
</body></html>`);
  w.document.close();
  w.focus();
}
