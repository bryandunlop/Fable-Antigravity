import fs from 'fs';
import path from 'path';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  Footer, PageNumber, LevelFormat, convertInchesToTwip,
} from 'docx';
import { DOCS, SCOPE_NOTE, DEMO_NOTE } from './content.mjs';

const SHOTS_DIR = process.argv[2] || './annotated';
const OUT_DIR = process.argv[3] || './docx';
fs.mkdirSync(OUT_DIR, { recursive: true });

const NAVY = '10307C';
const ORANGE = 'E8590C';
const GREY = '5A6472';
const RULE = 'D6DAE2';

const LETTER = { width: 12240, height: 15840 };
const CONTENT_W = 12240 - convertInchesToTwip(1) * 2;   // 6.5in usable
const IMG_W = 624;                                       // px at 96dpi = 6.5in
const IMG_H = Math.round(IMG_W * (2100 / 3200));         // preserve 3200x2100

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 140, line: 288 },
  alignment: opts.align,
  children: [new TextRun({
    text, size: opts.size ?? 21, color: opts.color, bold: opts.bold,
    italics: opts.italics, font: 'Calibri',
  })],
});

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 },
  children: [new TextRun({ text: t, size: 30, bold: true, color: NAVY, font: 'Calibri' })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
  children: [new TextRun({ text: t, size: 25, bold: true, color: NAVY, font: 'Calibri' })],
});

const rule = () => new Paragraph({
  spacing: { before: 60, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
  children: [new TextRun({ text: '', size: 2 })],
});

/** Tinted note box. */
function noteBox(title, lines, tint = 'F2F5FA', accent = NAVY) {
  const kids = [];
  if (title) kids.push(new Paragraph({
    spacing: { after: 90 },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 17, color: accent, font: 'Calibri' })],
  }));
  lines.forEach((l, i) => kids.push(new Paragraph({
    spacing: { after: i === lines.length - 1 ? 0 : 110, line: 276 },
    children: [new TextRun({ text: l, size: 20, color: '2A2F3A', font: 'Calibri' })],
  })));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: tint },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: tint },
      right: { style: BorderStyle.SINGLE, size: 2, color: tint },
      left: { style: BorderStyle.SINGLE, size: 18, color: accent },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: tint, color: 'auto' },
        margins: { top: 170, bottom: 170, left: 200, right: 200 },
        children: kids,
      })],
    })],
  });
}

/** Sidebar navigation table. */
function navTable(rows) {
  const w = [Math.round(CONTENT_W * 0.30), Math.round(CONTENT_W * 0.18)];
  w.push(CONTENT_W - w[0] - w[1]);
  const cell = (t, i, head) => new TableCell({
    width: { size: w[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: head ? NAVY : 'FFFFFF', color: 'auto' },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    children: [new Paragraph({
      spacing: { after: 0, line: 264 },
      children: [new TextRun({
        text: t, size: head ? 18 : 19, bold: head,
        color: head ? 'FFFFFF' : '2A2F3A', font: 'Calibri',
      })],
    })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: w,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      left: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      right: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: RULE },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [cell('Page', 0, true), cell('Sidebar group', 1, true), cell('What it is for', 2, true)],
      }),
      ...rows.map(r => new TableRow({ children: [cell(r[0], 0), cell(r[1], 1), cell(r[2], 2)] })),
    ],
  });
}

/** Screenshot with caption, then its numbered callout explanations. */
function shotBlock(shot) {
  const file = path.join(SHOTS_DIR, `${shot.id}.png`);
  if (!fs.existsSync(file)) throw new Error(`missing screenshot: ${file}`);
  const out = [
    new Paragraph({
      spacing: { before: 140, after: 60 }, alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: 'png', data: fs.readFileSync(file),
        transformation: { width: IMG_W, height: IMG_H },
      })],
    }),
    new Paragraph({
      spacing: { after: 170 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: shot.caption, size: 18, italics: true, color: GREY, font: 'Calibri' })],
    }),
  ];
  for (const [n, text] of shot.calls) {
    out.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [420, CONTENT_W - 420],
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 420, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 0, right: 80 },
            children: [new Paragraph({
              spacing: { after: 0 },
              children: [new TextRun({ text: String(n), bold: true, size: 21, color: ORANGE, font: 'Calibri' })],
            })],
          }),
          new TableCell({
            width: { size: CONTENT_W - 420, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 0, right: 0 },
            children: [new Paragraph({
              spacing: { after: 0, line: 276 },
              children: [new TextRun({ text, size: 20, color: '2A2F3A', font: 'Calibri' })],
            })],
          }),
        ],
      })],
    }));
  }
  out.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '', size: 2 })] }));
  return out;
}

function titlePage(doc) {
  const kids = [
    new Paragraph({ spacing: { before: 2600, after: 0 },
      children: [new TextRun({ text: 'myGFO', size: 26, bold: true, color: ORANGE, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 60 },
      children: [new TextRun({ text: 'Global Flight Operations', size: 22, color: GREY, font: 'Calibri' })] }),
    new Paragraph({ spacing: { before: 420, after: 40 },
      children: [new TextRun({ text: doc.title, size: 62, bold: true, color: NAVY, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 300 },
      children: [new TextRun({
        text: doc.kind === 'supplement' ? 'Training Guide — Manager Supplement' : 'Training Guide',
        size: 28, color: GREY, font: 'Calibri' })] }),
    rule(),
    p(doc.purpose, { size: 22, after: 260 }),
  ];
  if (doc.kind === 'supplement') {
    kids.push(noteBox('Read this first', [
      `This is a supplement. It covers only what is additional to the ${doc.base} role.`,
      `Read the ${doc.base} training guide before this one — the shared workflows are documented there and are not repeated here.`,
    ], 'FFF4EC', ORANGE));
    kids.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '', size: 2 })] }));
  }
  kids.push(noteBox('Who this is for', doc.audience));
  kids.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '', size: 2 })] }));
  kids.push(noteBox('Scope of this guide', SCOPE_NOTE));
  kids.push(new Paragraph({ children: [new PageBreak()] }));
  return kids;
}

function build(doc) {
  const body = [...titlePage(doc)];

  body.push(h1('Getting started'));
  body.push(p(DEMO_NOTE, { italics: true, color: GREY, after: 200 }));

  body.push(h2('Where you land'));
  body.push(p(doc.frontDoorNote));
  body.push(p(`Front door: ${doc.frontDoor}.`, { bold: true, after: 200 }));

  if (doc.gapNote) {
    body.push(noteBox('Known gap in this role', doc.gapNote, 'FFF4EC', ORANGE));
    body.push(new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: '', size: 2 })] }));
  }

  if (doc.nav.length) {
    body.push(h2(doc.kind === 'supplement' ? 'Your additional pages' : 'Your sidebar at a glance'));
    if (doc.kind === 'supplement') {
      body.push(p(`These are the pages this supplement covers. Your sidebar also carries everything documented in the ${doc.base} guide.`));
    } else {
      body.push(p('Your role decides which of these appear. Pages are grouped in the sidebar as shown.'));
    }
    body.push(navTable(doc.nav));
    body.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: '', size: 2 })] }));
  }

  for (const s of doc.sections) {
    if (s.heading) body.push(h1(s.heading));
    for (const t of (s.body || [])) body.push(p(t));
    if (s.bullets) {
      for (const b of s.bullets) {
        body.push(new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 90, line: 276 },
          children: [new TextRun({ text: b, size: 21, font: 'Calibri' })],
        }));
      }
      body.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '', size: 2 })] }));
    }
    if (s.shot) body.push(...shotBlock(s.shot));
  }

  return new Document({
    creator: 'myGFO', title: `myGFO ${doc.title} Training Guide`,
    description: doc.purpose,
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 240 } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { size: LETTER, margin: {
        top: convertInchesToTwip(1), bottom: convertInchesToTwip(1),
        left: convertInchesToTwip(1), right: convertInchesToTwip(1),
      } } },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
          children: [new TextRun({
            text: `myGFO — ${doc.title} Training Guide   ·   `, size: 16, color: GREY, font: 'Calibri' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY, font: 'Calibri' }),
          ],
        })] }),
      },
      children: body,
    }],
  });
}

for (const doc of DOCS) {
  const buf = await Packer.toBuffer(build(doc));
  const out = path.join(OUT_DIR, `${doc.file}.docx`);
  fs.writeFileSync(out, buf);
  const shots = doc.sections.filter(s => s.shot).length;
  console.log(`${out}  (${Math.round(buf.length / 1024)} KB, ${shots} screenshots)`);
}
console.log(`\n${DOCS.length} documents written to ${OUT_DIR}`);
