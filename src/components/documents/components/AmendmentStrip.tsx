import { FileStack } from 'lucide-react';
import type { DocSection } from '../types';
import type { AmendmentInForce } from '../engine/amendments';

/**
 * The document-level "this revision is not the whole story" notice (TL-46).
 *
 * A reader who opens a manual should know before the first paragraph that part of
 * it has been amended — not discover it only if they happen to scroll to the right
 * section. Section-level chips handle the detail; this handles the warning.
 *
 * Blue, not amber. The reader's callout palette already spends amber on `caution`
 * and orange on `warning`, and `SectionedContent` is explicit that document amber
 * must never borrow the RAG status palette. An amendment is a pointer, not a hazard.
 */
export function AmendmentStrip({
  amendments,
  sections,
}: {
  amendments: AmendmentInForce[];
  sections: DocSection[];
}) {
  if (amendments.length === 0) return null;

  const titleFor = (sectionId?: string) => {
    if (!sectionId) return undefined;
    const s = sections.find((sec) => sec.id === sectionId);
    if (!s) return undefined;
    return `${s.number ? `${s.number} ` : ''}${s.title}`.trim() || undefined;
  };

  const named = amendments.map((a) => titleFor(a.targetSectionId)).filter(Boolean) as string[];
  const wide = amendments.length - named.length;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-accent/40 bg-secondary p-3.5">
      <FileStack className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">
          {amendments.length === 1
            ? '1 amendment is in force against this revision'
            : `${amendments.length} amendments are in force against this revision`}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-primary/90">
          {named.length > 0 && (
            <>
              {named.length === 1 ? 'Section ' : 'Sections '}
              <strong>{named.join(', ')}</strong>
              {wide > 0 ? ' and ' : ' '}
            </>
          )}
          {wide > 0 && (
            <>
              {wide === 1 ? 'a document-wide change ' : `${wide} document-wide changes `}
            </>
          )}
          {named.length + wide === 1 ? 'has' : 'have'} been amended by bulletins issued since this
          revision. The amended text governs.
        </p>
      </div>
    </div>
  );
}
