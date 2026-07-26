#!/usr/bin/env node
/**
 * Typecheck baseline gate — TL-27.
 *
 * `vite build` transpiles but never typechecks, so type regressions ship
 * silently (this is the structural reason the UX audit found so many facade
 * controls). This gate runs `tsc --noEmit` and fails only when a NEW type error
 * appears above a committed baseline. The pre-existing errors are grandfathered
 * so the gate can land now — without a large, conflict-prone mechanical fix
 * across many components — and the baseline is burned down over time by fixing
 * errors and re-running with `--update`.
 *
 * A signature deliberately DROPS the line/column so an unrelated edit that
 * shifts a pre-existing error's position does not read as "new". Occurrences of
 * the same signature in one file are tracked by count, so adding an error that
 * RAISES a signature's count is caught. Known blind spot: fixing one occurrence
 * of a signature and adding a different one of the SAME shape (same file, code,
 * and message) in the same file nets to no count change and passes — an accepted
 * tradeoff for a grandfathering gate (the burndown surfaces it). Widen the
 * signature to the erroring source line's text if that gap ever bites.
 *
 * Usage:
 *   node scripts/typecheck-baseline.mjs            # check; exit 1 on new errors
 *   node scripts/typecheck-baseline.mjs --update   # rewrite the baseline
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'typecheck-baseline.json');
const LINE_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

function runTsc() {
  const bin = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (!existsSync(bin)) {
    console.error('✗ typecheck gate: TypeScript is not installed. Run: npm ci');
    process.exit(1);
  }
  try {
    execFileSync(bin, ['--noEmit', '--pretty', 'false'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { output: '', threw: false }; // exit 0 → no type errors
  } catch (e) {
    // Distinguish "tsc ran and reported diagnostics" (exit non-zero, output on
    // stdout) from "tsc never completed" (missing binary, killed by a signal,
    // output over the buffer). The latter must fail CLOSED — parsing its empty
    // output as "0 errors" would falsely report the gate passed. A non-diagnostic
    // tsc failure (e.g. a broken tsconfig) is caught by the empty-but-threw guard
    // at the call site.
    if (e.code === 'ENOENT') {
      console.error('✗ typecheck gate: could not run tsc. Run: npm ci');
      process.exit(1);
    }
    if (e.signal) {
      console.error(`✗ typecheck gate: tsc was killed by ${e.signal} before finishing — not a clean result (out of memory?). Investigate and retry.`);
      process.exit(1);
    }
    if (e.code === 'ENOBUFS') {
      console.error('✗ typecheck gate: tsc output exceeded the read buffer — raise maxBuffer.');
      process.exit(1);
    }
    return { output: `${e.stdout ?? ''}${e.stderr ?? ''}`, threw: true };
  }
}

function parse(output) {
  const counts = {};
  for (const line of output.split(/\r?\n/)) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const [, file, , , code, message] = m;
    const sig = `${file.replace(/\\/g, '/')}: ${code}: ${message}`;
    counts[sig] = (counts[sig] ?? 0) + 1;
  }
  return counts;
}

const total = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);

const update = process.argv.includes('--update');
const { output, threw } = runTsc();
const current = parse(output);

// tsc exited non-zero but produced no parseable diagnostics → it failed for a
// non-diagnostic reason (broken tsconfig, internal error). Fail closed rather
// than mistaking it for "0 errors" and either passing the gate or writing an
// empty baseline. Guards both --check and --update.
if (threw && Object.keys(current).length === 0) {
  console.error('✗ typecheck gate: tsc exited with an error but produced no parseable diagnostics — it likely did not complete.\n');
  console.error(output.trim() || '(no output captured)');
  process.exit(1);
}

if (update) {
  const sorted = Object.fromEntries(
    Object.entries(current).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `✓ baseline updated: ${total(current)} error(s) across ${Object.keys(current).length} signature(s).`,
  );
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error('✗ typecheck gate: no typecheck-baseline.json.');
  console.error('  Generate it once with: node scripts/typecheck-baseline.mjs --update');
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const newErrors = [];
for (const [sig, count] of Object.entries(current)) {
  const allowed = baseline[sig] ?? 0;
  if (count > allowed) newErrors.push({ sig, count, allowed });
}

const curTotal = total(current);
const baseTotal = total(baseline);

if (newErrors.length > 0) {
  console.error(`✗ typecheck gate: ${newErrors.length} new type error(s) above the baseline\n`);
  for (const { sig, count, allowed } of newErrors) {
    console.error(`  ${sig}${allowed ? `  (baseline ${allowed}, now ${count})` : ''}`);
  }
  console.error(`\n  Fix the error(s) above before pushing. (baseline ${baseTotal}, current ${curTotal})`);
  console.error('  If this is an intentional, reviewed change to pre-existing code, run:');
  console.error('    node scripts/typecheck-baseline.mjs --update');
  process.exit(1);
}

if (curTotal < baseTotal) {
  console.log(`✓ typecheck gate passed — and ${baseTotal - curTotal} pre-existing error(s) are now fixed.`);
  console.log('  Lock in the progress by lowering the baseline:');
  console.log('    node scripts/typecheck-baseline.mjs --update');
} else {
  console.log(`✓ typecheck gate passed — no new type errors (baseline ${baseTotal}).`);
}
process.exit(0);
