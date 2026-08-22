// Printable status of contents — the copy that leaves the building.
//
// Same discipline as printDocument: anything printed from a controlled system is
// an uncontrolled copy the moment it exists, so it says so on the page and in the
// watermark. What makes this one worth printing is that it is the single sheet
// that answers "is this library current" without anyone opening the manual.
import type { EffectivePagesReport } from '../engine/effectivePages';
import { escapeHtml } from '../engine/exportHtml';
import { operatorTodayIso, formatDateOnly } from '../../../lib/operatorDate';

/** Returns false if the browser blocked the pop-up (caller shows a toast). */
export function printEffectivePages(report: EffectivePagesReport): boolean {
  const w = window.open('', '_blank', 'width=880,height=1040');
  if (!w) return false;

  const d = (iso: string) => formatDateOnly(iso);
  const rows = report.rows
    .map(
      (r) => `<tr>
        <td class="num">${escapeHtml(r.number || '—')}</td>
        <td>${escapeHtml(r.title)}</td>
        <td class="num">${escapeHtml(r.revisionLabel)}</td>
        <td class="num">${escapeHtml(d(r.effectiveDate))}</td>
        <td>${
          r.amendedBy.length
            ? `<span class="amd">Amended — ${escapeHtml(r.amendedBy.join(', '))}</span>`
            : '<span class="cur">Current</span>'
        }</td>
      </tr>`,
    )
    .join('');

  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(report.docTitle)} — status of contents</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111; margin:0; padding:36px 44px; position:relative; }
  .wm { position:fixed; inset:0; z-index:0; pointer-events:none; display:flex; align-items:center; justify-content:center; }
  .wm span { transform:rotate(-32deg); font-size:56px; font-weight:800; color:rgba(0,32,91,0.06); letter-spacing:2px; white-space:nowrap; }
  .page { position:relative; z-index:1; }
  .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #00205B; padding-bottom:12px; }
  .brand { font-size:19px; font-weight:800; color:#00205B; letter-spacing:-0.02em; }
  .brand small { display:block; font-weight:600; font-size:10px; color:#555; letter-spacing:0.05em; text-transform:uppercase; }
  .doctype { text-align:right; font-size:11px; color:#555; }
  h1 { font-size:20px; margin:18px 0 4px; }
  .meta { color:#555; font-size:12px; }
  .chk { font-family:ui-monospace, Menlo, monospace; font-size:10px; color:#999; margin-top:4px; }
  .sum { display:flex; gap:22px; font-size:12px; border-top:1px solid #ddd; border-bottom:1px solid #ddd; padding:9px 0; margin:14px 0 6px; }
  .sum strong { font-size:14px; }
  table { border-collapse:collapse; width:100%; font-size:12px; margin-top:6px; }
  th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.06em; color:#00205B; border-bottom:2px solid #00205B; padding:0 8px 6px; }
  td { border-bottom:1px solid #e5e7eb; padding:6px 8px; vertical-align:top; }
  .num { font-variant-numeric:tabular-nums; }
  .amd { color:#00205B; font-weight:600; }
  .cur { color:#666; }
  .ft { margin-top:22px; border-top:1px solid #ddd; padding-top:10px; font-size:11px; color:#444; display:flex; gap:36px; }
  .ft p { margin:0 0 3px; }
  .ft .lbl { font-size:9px; text-transform:uppercase; letter-spacing:0.06em; font-weight:700; color:#00205B; }
  .note { margin-top:16px; font-size:10px; color:#888; line-height:1.5; }
  @media print { body { padding:0 12px; } .noprint { display:none; } }
  .noprint { margin-bottom:16px; }
  button { font-size:13px; padding:8px 16px; border-radius:6px; border:1px solid #00205B; background:#00205B; color:#fff; cursor:pointer; }
</style></head>
<body>
  <div class="wm"><span>UNCONTROLLED WHEN PRINTED</span></div>
  <div class="page">
    <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="hd">
      <div class="brand">Global Flight Operations<small>Document control</small></div>
      <div class="doctype">
        <div>${escapeHtml(report.classLabel)}</div>
        <div>${escapeHtml(report.docId)}</div>
      </div>
    </div>

    <h1>${escapeHtml(report.docTitle)} — status of contents</h1>
    <div class="meta">Revision ${escapeHtml(report.revisionLabel)} · effective ${escapeHtml(d(report.effectiveDate))} · generated ${escapeHtml(d(operatorTodayIso()))}</div>
    ${report.checksum ? `<div class="chk">content digest ${escapeHtml(report.checksum.slice(0, 16))}…</div>` : ''}

    <div class="sum">
      <span><strong>${report.sectionCount}</strong> sections</span>
      <span><strong>${report.sectionCount - report.amendedCount}</strong> current at rev ${escapeHtml(report.revisionLabel)}</span>
      ${report.amendedCount ? `<span><strong>${report.amendedCount}</strong> amended by bulletin</span>` : ''}
    </div>

    <table>
      <thead><tr><th>§</th><th>Section</th><th>Revision</th><th>Effective</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="ft">
      <div>
        <p class="lbl">Acknowledgement</p>
        <p>${
          report.ackRequired === 0
            ? 'No read receipt required for this revision.'
            : `${report.acknowledged} of ${report.ackRequired} assigned readers${
                report.acknowledged < report.ackRequired
                  ? ` · ${report.ackRequired - report.acknowledged} outstanding`
                  : ''
              }`
        }</p>
      </div>
      <div>
        <p class="lbl">Approval</p>
        <p>${
          report.approvedBy
            ? `Drafted by ${escapeHtml(report.authoredBy ?? 'unknown')}, approved by ${escapeHtml(report.approvedBy)}${
                report.approvedOn ? `, ${escapeHtml(d(report.approvedOn))}` : ''
              }.`
            : 'Published without a recorded four-eyes approval.'
        }</p>
      </div>
    </div>

    <p class="note">Sections, not pages. A section is the unit that carries a revision; page numbers move with paper size and font, so this report names sections and stays true however it is printed. A section shown as amended carries wording from the bulletin named against it.</p>
  </div>
</body></html>`);
  w.document.close();
  return true;
}
