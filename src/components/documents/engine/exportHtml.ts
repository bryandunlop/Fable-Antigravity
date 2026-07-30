// Pure DocSection[] -> printable HTML body. Converts per block TYPE (blocks are
// pre-classified) rather than parsing general markdown. No React / no DOM — the
// output string is embedded into a print window (see util/printDocument.ts) and
// is unit-tested. All text is HTML-escaped before inline markdown is applied.
import type { DocSection, DocBlock } from '../types';
import { stepNumbers, stepBody } from './blocks';

export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

/** Inline markdown on already-escaped text: bold, italic, code, links. */
export function inlineMd(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\b_([^_\n]+)_\b/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
}

const line = (s: string) => inlineMd(escapeHtml(s));

function listHtml(md: string): string {
  const items = md.split('\n').filter((l) => l.trim());
  const ordered = /^\s*\d+\./.test(items[0] ?? '');
  const lis = items.map((l) => `<li>${line(l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''))}</li>`).join('');
  return ordered ? `<ol>${lis}</ol>` : `<ul>${lis}</ul>`;
}

function tableHtml(md: string): string {
  const rows = md.split('\n').filter((l) => l.includes('|'));
  if (rows.length < 2) return `<p>${line(md)}</p>`;
  const cells = (r: string) => r.replace(/^\s*\|?|\|?\s*$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const th = head.map((c) => `<th>${line(c)}</th>`).join('');
  const trs = body.map((r) => `<tr>${r.map((c) => `<td>${line(c)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function calloutHtml(block: DocBlock): string {
  const kind = block.calloutKind ?? 'note';
  const body = block.md.replace(/^>\s*\[![^\]]*\]\s*/i, '').replace(/^>\s?/gm, '');
  const inner = body.split(/\n{2,}/).map((p) => `<p>${line(p)}</p>`).join('');
  return `<div class="callout callout-${kind}"><p class="callout-k">${kind}</p>${inner}</div>`;
}

function figureHtml(block: DocBlock): string {
  const m = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(block.md.trim());
  if (!m) return `<p>${line(block.md)}</p>`;
  return `<figure><img src="${m[2]}" alt="${escapeHtml(m[1])}" />${m[1] ? `<figcaption>${escapeHtml(m[1])}</figcaption>` : ''}</figure>`;
}

function stepHtml(block: DocBlock, n: number | undefined): string {
  const lines = stepBody(block.md).split('\n');
  const prose: string[] = [];
  const figures: string[] = [];
  for (const l of lines) {
    const m = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(l.trim());
    if (m) figures.push(`<img src="${m[2]}" alt="${escapeHtml(m[1])}" />`);
    else if (l.trim()) prose.push(`<p>${line(l)}</p>`);
  }
  return `<div class="step"><p class="step-n">${n ?? ''}</p><div class="step-b">${prose.join('')}${figures.join('')}</div></div>`;
}

export function blockToHtml(block: DocBlock, stepNumber?: number): string {
  switch (block.type) {
    case 'step': return stepHtml(block, stepNumber);
    case 'callout': return calloutHtml(block);
    case 'figure': return figureHtml(block);
    case 'table': return tableHtml(block.md);
    case 'list': return listHtml(block.md);
    case 'heading': {
      const m = /^(#{3,6})\s+(.*)$/.exec(block.md.trim());
      const level = m ? m[1].length : 3;
      return `<h${level}>${line(m ? m[2] : block.md)}</h${level}>`;
    }
    default:
      return block.md.split(/\n{2,}/).map((p) => `<p>${line(p)}</p>`).join('');
  }
}

export function sectionsToHtml(sections: DocSection[]): string {
  return sections
    .map((s) => {
      const heading = s.title || s.number
        ? `<h2 class="sec">${escapeHtml(`${s.number ? `${s.number} ` : ''}${s.title}`)}</h2>`
        : '';
      const steps = stepNumbers(s.blocks);
      const blocks = s.blocks.map((b) => blockToHtml(b, steps.get(b.id))).join('\n');
      return `<section>${heading}${blocks}</section>`;
    })
    .join('\n');
}
