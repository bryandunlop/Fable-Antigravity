/**
 * Generates docs/vendor/myairops-capability-matrix.md from the captured vendor
 * OpenAPI documents in src/integration/myairops/schemas/.
 *
 * Why a generator and not a hand-written table: myairops ships new APIs via release
 * notes, and the read/write split is the thing we negotiate access on. A table
 * maintained by hand goes stale silently and we end up asking the vendor for a
 * capability we already have (or worse, assuming we have one we don't). Drop a new
 * schema in schemas/, add it to SURFACES, re-run.
 *
 *   npm run gen:myairops-matrix
 *
 * Classification comes from src/integration/myairops/capability.ts — the same function
 * the runtime write-guard uses, so this document and the guard cannot disagree about
 * what an operation does. Anything the classifier is unsure about is emitted as
 * UNCLASSIFIED so it shows up in review instead of being quietly bucketed.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyEffect, NON_MUTATING, type Effect } from '../src/integration/myairops/capability';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SCHEMA_DIR = resolve(REPO, 'src/integration/myairops/schemas');
const OUT = resolve(REPO, 'docs/vendor/myairops-capability-matrix.md');

/** The vendor APIs we hold a spec for. Keep in sync with `npm run gen:myairops`. */
const SURFACES = [
  { key: 'booking', file: 'booking.json', label: 'Booking API', host: 'booking-api.pandg.flight.myairops.com' },
  { key: 'crm', file: 'crm.json', label: 'CRM API', host: 'crm-api.pandg.flight.myairops.com' },
  { key: 'maintenance', file: 'maintenance.json', label: 'MX (Maintenance) API', host: 'maintenance-api.pandg.flight.myairops.com' },
] as const;

/**
 * Vendor APIs we know exist but hold NO spec for. They are listed in the output so the
 * gap is visible in the same table we take to myairops — an API missing from the matrix
 * must never read as "no such API".
 */
const UNSPECIFIED_SURFACES = [
  { label: 'Attachments API', host: 'attachment-api.pandg.flight.myairops.com', docs: '/swagger/index.html' },
  { label: 'Schedule API', host: 'schedule-api.pandg.flight.myairops.com', docs: '/docs/index.html' },
] as const;

interface Op {
  method: string;
  path: string;
  summary: string;
  tag: string;
  effect: Effect;
}

function loadOps(file: string): Op[] {
  const doc = JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as {
    paths: Record<string, Record<string, { summary?: string; operationId?: string; tags?: string[] }>>;
  };
  const ops: Op[] = [];
  for (const path of Object.keys(doc.paths).sort()) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = doc.paths[path][method];
      if (!op) continue;
      ops.push({
        method: method.toUpperCase(),
        path,
        summary: (op.summary ?? op.operationId ?? '').trim(),
        tag: op.tags?.[0] ?? '—',
        effect: classifyEffect(method.toUpperCase(), path),
      });
    }
  }
  return ops;
}

function schemaVersion(file: string): string {
  const doc = JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as {
    info?: { title?: string; version?: string };
    openapi?: string;
    swagger?: string;
  };
  return `${doc.info?.version ?? '?'} (OpenAPI ${doc.openapi ?? doc.swagger ?? '?'})`;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function render(): string {
  const lines: string[] = [];
  lines.push('# myairops API capability matrix');
  lines.push('');
  lines.push(
    '> **Generated file — do not edit by hand.** Produced by `scripts/myairops-capability-matrix.ts`',
    '> (`npm run gen:myairops-matrix`) from the vendor OpenAPI documents in',
    '> `src/integration/myairops/schemas/`. To correct an entry, fix the schema capture or the',
    '> classifier, then regenerate. Curated product commentary lives in',
    '> `docs/vendor/myairops-integration-asks.md`, not here.',
  );
  lines.push('');
  lines.push(
    'Every operation the vendor publishes, classified by **effect on myairops state**. This is the',
    'evidence behind "which APIs are read-only and which we need write access to": the answer is',
    'not per-API but per-operation — all three specced APIs publish a full write surface.',
  );
  lines.push('');

  lines.push('## Effect legend');
  lines.push('');
  lines.push('| Effect | Mutates myairops? | Meaning |');
  lines.push('| --- | --- | --- |');
  lines.push('| `read` | no | GET. Safe under a read-only credential. |');
  lines.push('| `compute` | no | POST that returns a calculation and persists nothing. |');
  lines.push('| `create` | **yes** | Inserts a new vendor record. |');
  lines.push('| `update` | **yes** | Edits an existing vendor record. |');
  lines.push('| `delete` | **yes** | Hard delete. No documented undo. |');
  lines.push('| `soft-delete` | **yes** | Reversible — has a matching `/restore`. |');
  lines.push('| `restore` | **yes** | Reverses a soft delete. |');
  lines.push('| `transition` | **yes** | Moves an entity along a status ladder (trip booking, MX release). |');
  lines.push('| `link` / `unlink` | **yes** | Associates or separates two existing records. |');
  lines.push('| `unclassified` | unknown | Classifier could not decide — resolve before use. |');
  lines.push('');

  const totals: Record<string, { read: number; write: number; total: number }> = {};

  for (const s of SURFACES) {
    const ops = loadOps(s.file);
    const read = ops.filter(o => NON_MUTATING.has(o.effect)).length;
    totals[s.label] = { read, write: ops.length - read, total: ops.length };
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| API | Host | Spec version | Operations | Non-mutating | **Mutating** |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: |');
  for (const s of SURFACES) {
    const t = totals[s.label];
    lines.push(
      `| ${s.label} | \`${s.host}\` | ${schemaVersion(s.file)} | ${t.total} | ${t.read} | **${t.write}** |`,
    );
  }
  for (const u of UNSPECIFIED_SURFACES) {
    lines.push(`| ${u.label} | \`${u.host}\` | **no spec captured** | ? | ? | ? |`);
  }
  lines.push('');
  lines.push(
    `**${UNSPECIFIED_SURFACES.length} of ${SURFACES.length + UNSPECIFIED_SURFACES.length} published APIs are unspecced.** ` +
      'The Attachments and Schedule APIs are documented by the vendor but their specs are not in this repo, ' +
      'so they are absent from the per-operation tables below. Absent here means *unknown*, not *read-only*.',
  );
  lines.push('');

  for (const s of SURFACES) {
    const ops = loadOps(s.file);
    lines.push(`## ${s.label}`);
    lines.push('');
    lines.push(`\`https://${s.host}\` — spec ${schemaVersion(s.file)}`);
    lines.push('');

    const byTag = new Map<string, Op[]>();
    for (const o of ops) {
      const list = byTag.get(o.tag) ?? [];
      list.push(o);
      byTag.set(o.tag, list);
    }

    for (const tag of [...byTag.keys()].sort()) {
      lines.push(`### ${tag}`);
      lines.push('');
      lines.push('| Effect | Operation | Summary |');
      lines.push('| --- | --- | --- |');
      for (const o of byTag.get(tag)!) {
        const mark = NON_MUTATING.has(o.effect) ? o.effect : `**${o.effect}**`;
        lines.push(`| ${mark} | \`${o.method} ${escapeCell(o.path)}\` | ${escapeCell(o.summary)} |`);
      }
      lines.push('');
    }
  }

  const unclassified = SURFACES.flatMap(s => loadOps(s.file).filter(o => o.effect === 'unclassified'));
  lines.push('## Unclassified operations');
  lines.push('');
  lines.push(
    unclassified.length === 0
      ? 'None — every published operation was classified.'
      : unclassified.map(o => `- \`${o.method} ${o.path}\``).join('\n'),
  );
  lines.push('');

  return lines.join('\n');
}

const markdown = render();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, markdown, 'utf8');
process.stdout.write(`wrote ${OUT}\n`);
