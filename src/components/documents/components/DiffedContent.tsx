import type { BlockDiff, DocDiff, WordSegment } from '../engine/diff';
import { BlockBody } from './SectionedContent';

// Change marks live on the amber/coral axis (spec D-11) — additions amber, removals
// orange/coral. NEVER red/green/yellow (the CAMP RAG status palette) or the custody gold/blue.
const CHANGE_BAR = 'border-l-2 border-amber-400 pl-3 dark:border-amber-500';
const ADDED_TINT = 'rounded-r bg-amber-50/60 dark:bg-amber-900/10';
const CHANGED_CHIP = 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
const REMOVED_WORD = 'rounded-sm bg-orange-100 px-0.5 text-orange-900 line-through decoration-orange-400 dark:bg-orange-950/40 dark:text-orange-200';

function WordSegments({ segments }: { segments: WordSegment[] }) {
  return (
    <p className="whitespace-pre-wrap">
      {segments.map((s, i) =>
        s.kind === 'same' ? (
          <span key={i}>{s.text}</span>
        ) : s.kind === 'added' ? (
          <mark key={i} className="rounded-sm bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-700/50 dark:text-amber-50">{s.text}</mark>
        ) : (
          <del key={i} className={REMOVED_WORD}>{s.text}</del>
        ),
      )}
    </p>
  );
}

function BlockRow({ bd }: { bd: BlockDiff }) {
  if (bd.kind === 'removed') {
    return (
      <details data-block-id={bd.id} data-changed className="my-2 rounded border border-dashed border-orange-300 bg-orange-50/50 px-3 py-1.5 text-sm dark:border-orange-900 dark:bg-orange-950/20">
        <summary className="cursor-pointer select-none text-orange-800 dark:text-orange-300">Content removed here</summary>
        <div className="mt-1 whitespace-pre-wrap text-orange-900/80 line-through dark:text-orange-200/70">{bd.prevBlock?.md}</div>
      </details>
    );
  }
  const changed = bd.kind === 'added' || bd.kind === 'modified' || bd.kind === 'moved';
  return (
    <div
      data-block-id={bd.id}
      data-changed={changed || undefined}
      className={`${changed ? CHANGE_BAR : ''} ${bd.kind === 'added' ? ADDED_TINT : ''}`}
    >
      {bd.kind === 'moved' && <span className={`${CHANGED_CHIP} mb-1 inline-block`}>Moved</span>}
      {bd.kind === 'modified' && bd.segments ? (
        <WordSegments segments={bd.segments} />
      ) : bd.block ? (
        <BlockBody block={bd.block} />
      ) : null}
    </div>
  );
}

/** Renders the next-revision tree with computed change marks. `data-changed`
 * attributes let the reader's prev/next navigation find changed elements. */
export function DiffedContent({ diff }: { diff: DocDiff }) {
  return (
    <>
      {diff.sections.map((sd) => {
        const s = sd.section ?? sd.prevSection;
        if (!s) return null;
        // Only a PURE heading change (no block change) contributes its own nav stop;
        // sections with block changes are reached via their block-level data-changed.
        const headingOnlyStop = sd.kind === 'renumbered' || sd.kind === 'retitled';
        const heading = `${s.number ? `${s.number} ` : ''}${s.title}`;
        return (
          <section
            key={sd.id}
            data-section-id={sd.id}
            data-changed={headingOnlyStop || undefined}
            className={sd.kind === 'added' ? CHANGE_BAR : ''}
          >
            {(s.title || s.number) && (
              <div className="flex items-center gap-2">
                {s.level <= 1 ? <h1 className="!mb-0">{heading}</h1> : <h2 className="!mb-0">{heading}</h2>}
                {sd.kind === 'added' && <span className={CHANGED_CHIP}>New section</span>}
                {sd.headingChanged && <span className={CHANGED_CHIP}>Heading changed</span>}
              </div>
            )}
            {sd.blocks.map((bd) => (
              <BlockRow key={bd.id} bd={bd} />
            ))}
          </section>
        );
      })}
    </>
  );
}
