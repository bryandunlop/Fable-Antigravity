// ID-embedded .docx review export (spec §7, Nimbl/vendor loop). Each block's ID is
// embedded as a hidden (vanish) text marker — invisible in Word, machine-readable so
// the (future) reconciliation import can re-anchor returned edits by block ID. Real
// product target is Word content controls (SDT); the `docx` package has no SDT, so a
// vanished marker is the forward-compatible demo stand-in.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Header, Footer, Table, TableRow, TableCell, WidthType, PageNumber,
} from 'docx';
import type { Doc, DocRevision, DocBlock } from '../types';
import { stepNumbers, stepBody } from './blocks';
import { formatDateOnly } from '../../../lib/operatorDate';

/** Machine-readable, human-invisible block-ID marker. */
export function idMarker(blockId: string): TextRun {
  return new TextRun({ text: `⟦${blockId}⟧`, vanish: true, size: 2 });
}

/** Inline **bold** on a line of text -> docx runs. */
function runs(text: string, lead: TextRun[] = []): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const body = parts.map((p) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(p);
    return new TextRun(b ? { text: b[1], bold: true } : { text: p });
  });
  return [...lead, ...(body.length ? body : [new TextRun(text)])];
}

function tableFor(md: string): Table | Paragraph {
  const rows = md.split('\n').filter((l) => l.includes('|'));
  if (rows.length < 2) return new Paragraph({ children: runs(md) });
  const cells = (r: string) => r.replace(/^\s*\|?|\|?\s*$/g, '').split('|').map((c) => c.trim());
  const data = [cells(rows[0]), ...rows.slice(2).map(cells)];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: data.map((r, ri) => new TableRow({
      children: r.map((c) => new TableCell({
        children: [new Paragraph({ children: runs(c) })],
      })),
      tableHeader: ri === 0,
    })),
  });
}

/** A block -> docx children (Paragraph/Table). The block ID marker leads the first child. */
export function blockToDocx(block: DocBlock, stepNumber?: number): (Paragraph | Table)[] {
  const lead = [idMarker(block.id)];
  switch (block.type) {
    case 'step': {
      // The reviewer's .docx has no card layout, so the number has to be in the text or it is lost.
      const body = stepBody(block.md).split('\n').filter((l) => l.trim() && !/^!\[/.test(l.trim())).join(' ');
      return [new Paragraph({
        children: [...lead, new TextRun({ text: `Step ${stepNumber ?? ''}. `, bold: true }), ...runs(body)],
      })];
    }
    case 'heading': {
      const m = /^(#{3,6})\s+(.*)$/.exec(block.md.trim());
      return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(m ? m[2] : block.md, lead) })];
    }
    case 'list':
      return block.md.split('\n').filter((l) => l.trim()).map((l, i) =>
        new Paragraph({ bullet: { level: 0 }, children: runs(l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''), i === 0 ? lead : []) }),
      );
    case 'table':
      return [new Paragraph({ children: lead }), tableFor(block.md)];
    case 'figure': {
      const m = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(block.md.trim());
      return [new Paragraph({ children: [...lead, new TextRun({ text: `[Figure: ${m ? m[1] || m[2] : block.md}]`, italics: true })] })];
    }
    case 'callout': {
      const kind = (block.calloutKind ?? 'note').toUpperCase();
      const body = block.md.replace(/^>\s*\[![^\]]*\]\s*/i, '').replace(/^>\s?/gm, '');
      return [new Paragraph({
        shading: { type: 'clear', fill: 'F2F6FA' },
        children: [...lead, new TextRun({ text: `${kind}: `, bold: true }), ...runs(body)],
      })];
    }
    default:
      return block.md.split(/\n{2,}/).map((p, i) => new Paragraph({ children: runs(p, i === 0 ? lead : []) }));
  }
}

/** Build the watermarked, ID-embedded review .docx as a Blob. */
export function buildReviewDocx(doc: Doc, rev: DocRevision): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(doc.title)] }),
    new Paragraph({ children: [new TextRun({ text: `${doc.id} · Revision ${rev.revision} · effective ${formatDateOnly(rev.effectiveDate)}`, color: '666666', size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: `Review copy — edit with tracked changes ON; do not remove the hidden block markers. sha256 ${rev.mockChecksum.slice(0, 12)}…`, italics: true, color: '999999', size: 16 })] }),
    ...rev.sections.flatMap((s) => {
      // NOT `flatMap(blockToDocx)`: flatMap passes the array index as the second argument, which
      // would land in `stepNumber` and number steps by block position instead of step position.
      const steps = stepNumbers(s.blocks);
      return [
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`${s.number ? `${s.number} ` : ''}${s.title}`)] }),
        ...s.blocks.flatMap((b) => blockToDocx(b, steps.get(b.id))),
      ];
    }),
  ];

  const document = new Document({
    creator: 'myGFO',
    title: `${doc.title} — ${doc.id} rev ${rev.revision}`,
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${doc.id} rev ${rev.revision} — UNCONTROLLED WHEN PRINTED`, color: 'AAAAAA', size: 16 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 16, color: 'AAAAAA' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: 'AAAAAA' })] })] }) },
      children,
    }],
  });

  return Packer.toBlob(document);
}
