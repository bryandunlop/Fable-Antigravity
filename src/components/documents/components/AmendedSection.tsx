import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DocRevision } from '../types';
import { docReaderPath } from '../classes';
import { replacementSection, type AmendmentInForce } from '../engine/amendments';
import { BlockBody } from './SectionedContent';
import { formatDateOnly } from '../../../lib/operatorDate';

/**
 * A manual section that a bulletin has amended (TL-46).
 *
 * Bryan's call, 2026-08-21: a quiet chip that expands — not the manual's wording
 * struck through beside the replacement. The reasoning is that whatever reads
 * FIRST must be what governs. Showing both at once invites a crew member skimming
 * on a ramp to land on the superseded sentence, and no amount of strikethrough
 * fully prevents that.
 *
 * So: the bulletin's governing text renders in the section's place, marked with a
 * quiet rule and a chip. The chip expands to reveal what the manual itself says.
 *
 * Neither document is edited. The manual's published bytes and content digest are
 * untouched; the governing text is resolved from the bulletin's own published
 * revision. Two frozen records, one reading order.
 */
export function AmendedSection({
  amendments,
  revisions,
  defaultBody,
}: {
  amendments: AmendmentInForce[];
  revisions: DocRevision[];
  /** What the manual's own section would render as. */
  defaultBody: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Where several bulletins amend one section, the most recently effective one
  // governs — and only that one supplies replacement wording. The others still
  // list on the chip so nothing is hidden.
  const ordered = [...amendments].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const governing = ordered[0];
  const replacement = replacementSection(governing, revisions);

  return (
    <div className="border-l-2 border-accent pl-4">
      {replacement ? (
        <div>
          {replacement.blocks.map((block) => (
            <BlockBody key={block.id} block={block} />
          ))}
        </div>
      ) : (
        defaultBody
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`mt-2 inline-flex items-center gap-1.5 border border-accent/40 bg-secondary px-2 py-1 text-xs font-semibold text-primary hover:border-accent ${
          open ? 'rounded-t' : 'rounded'
        }`}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Amended by {ordered.map((a) => a.sourceDocId).join(', ')} ·{' '}
        {formatDateOnly(governing.effectiveDate, { day: 'numeric', month: 'short', year: 'numeric' })}
      </button>

      {open && (
        <div className="rounded-b rounded-tr border border-accent/40 bg-muted/40 p-4">
          {replacement && (
            <>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                This document&rsquo;s own wording
              </p>
              <div className="text-muted-foreground">{defaultBody}</div>
              <div className="my-3 border-t border-border" />
            </>
          )}
          <ul className="space-y-2">
            {ordered.map((a) => (
              <li key={a.id} className="text-xs">
                <Link to={docReaderPath(a.sourceDocId)} className="font-semibold text-accent hover:underline">
                  {a.sourceDocId}
                </Link>
                <span className="text-muted-foreground">
                  {' '}
                  · effective{' '}
                  {formatDateOnly(a.effectiveDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <p className="mt-0.5 text-muted-foreground">{a.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
