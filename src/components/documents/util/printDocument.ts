// Human-readable PDF rendering of a controlled document revision (spec §7 —
// regulator/consultant/vendor tier). Demo: a styled printable HTML doc in a new
// window; the browser "Save as PDF" produces the file. ANY printed copy of a
// controlled doc is uncontrolled — the watermark + footer say so.
import type { Doc, DocRevision } from '../types';
import { classFor } from '../classes';
import { sectionsToHtml, escapeHtml } from '../engine/exportHtml';
import { operatorTodayIso } from '../../../lib/operatorDate';

/** Returns false if the browser blocked the pop-up (caller shows a toast). */
export function printDocument(doc: Doc, rev: DocRevision): boolean {
  const w = window.open('', '_blank', 'width=880,height=1040');
  if (!w) return false;

  const cfg = classFor(doc.classId);
  const eff = new Date(rev.effectiveDate).toLocaleDateString();
  const printed = new Date(operatorTodayIso()).toLocaleDateString();
  const body = sectionsToHtml(rev.sections);

  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(doc.title)} — ${escapeHtml(doc.id)} rev ${escapeHtml(rev.revision)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111; margin:0; padding:36px 44px; position:relative; }
  .wm { position:fixed; inset:0; z-index:0; pointer-events:none; display:flex; align-items:center; justify-content:center; }
  .wm span { transform:rotate(-32deg); font-size:60px; font-weight:800; color:rgba(0,32,91,0.06); letter-spacing:2px; white-space:nowrap; }
  .page { position:relative; z-index:1; }
  .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #00205B; padding-bottom:12px; }
  .brand { font-size:20px; font-weight:800; letter-spacing:-0.02em; color:#00205B; }
  .brand small { display:block; font-weight:600; font-size:11px; color:#555; letter-spacing:0.04em; text-transform:uppercase; }
  .doctype { text-align:right; font-size:11px; color:#555; }
  .doctype .badge { display:inline-block; border:1px solid #00205B; color:#00205B; border-radius:4px; padding:2px 8px; font-weight:700; font-size:10px; text-transform:uppercase; }
  h1 { font-size:22px; margin:20px 0 4px; }
  .meta { color:#555; font-size:12px; margin-bottom:6px; }
  .chk { font-family:ui-monospace, Menlo, monospace; font-size:10px; color:#999; margin-bottom:18px; }
  section { margin:14px 0; }
  h2.sec { font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:#00205B; border-bottom:1px solid #ddd; padding-bottom:4px; margin:18px 0 8px; }
  h3,h4,h5,h6 { margin:12px 0 4px; font-size:14px; }
  p { font-size:13px; line-height:1.55; margin:6px 0; }
  ul,ol { font-size:13px; line-height:1.5; margin:6px 0 6px 20px; }
  code { font-family:ui-monospace, Menlo, monospace; font-size:12px; background:#f2f2f2; padding:0 3px; border-radius:3px; }
  table { border-collapse:collapse; font-size:12px; margin:8px 0; width:100%; }
  th,td { border:1px solid #ccc; padding:4px 8px; text-align:left; }
  th { background:#f5f6f8; }
  figure { margin:10px 0; } figure img { max-width:100%; } figcaption { font-size:11px; color:#777; }
  .callout { border:1px solid #ddd; border-left-width:4px; border-radius:4px; padding:8px 12px; margin:10px 0; }
  .callout-note { border-left-color:#0284c7; background:#f0f9ff; }
  .callout-caution { border-left-color:#d97706; background:#fffbeb; }
  .callout-warning { border-left-color:#ea580c; background:#fff7ed; }
  .callout-k { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; font-weight:700; margin:0 0 4px; color:#555; }
  .ft { margin-top:26px; border-top:1px solid #ddd; padding-top:10px; font-size:10px; color:#888; }
  @media print { body { padding:0 12px; } .noprint { display:none; } .wm span { color:rgba(0,32,91,0.05); } }
  .noprint { margin-bottom:16px; }
  button { font-size:13px; padding:8px 16px; border-radius:6px; border:1px solid #00205B; background:#00205B; color:#fff; cursor:pointer; }
</style></head>
<body>
  <div class="wm"><span>UNCONTROLLED WHEN PRINTED</span></div>
  <div class="page">
    <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="hd">
      <div class="brand">myGFO<small>P&amp;G Global Flight Operations</small></div>
      <div class="doctype"><span class="badge">${escapeHtml(cfg.label)}</span><div style="margin-top:6px">${escapeHtml(doc.category)}</div></div>
    </div>
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="meta">${escapeHtml(doc.id)} &middot; Revision ${escapeHtml(rev.revision)} &middot; effective ${escapeHtml(eff)} &middot; printed ${escapeHtml(printed)}</div>
    <div class="chk">sha256 ${escapeHtml(rev.mockChecksum.slice(0, 16))}…</div>
    ${body}
    <div class="ft">
      Uncontrolled when printed — verify against the current published revision in myGFO before use.
      The authoritative record is the cryptographic spine in the myGFO ledger (content hash ${escapeHtml(rev.mockChecksum.slice(0, 12))}…).
    </div>
  </div>
</body></html>`);
  w.document.close();
  w.focus();
  return true;
}
