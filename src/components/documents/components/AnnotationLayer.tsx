import { useEffect, useState } from 'react';
import { Highlighter, Trash2, Unlink } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import type { DocRevision } from '../types';
import { useDocuments } from '../DocumentsContext';
import type { ResolvedAnnotation } from '../engine/annotations';
import { formatDateOnly } from '../../../lib/operatorDate';

/**
 * Personal notes shown against the block they mark (Phase 4).
 *
 * Deliberately NOT inline highlighting inside the rendered markdown. Injecting
 * marks into a rendered block means re-implementing the renderer, and getting it
 * subtly wrong on a table or a step list would corrupt the document's appearance
 * — a much worse failure than a note shown beneath the paragraph rather than
 * inside it. The marked words are quoted in the card, so nothing is lost about
 * WHAT was marked; only the inline colour is deferred.
 */
export function BlockAnnotations({
  notes,
  userRole,
}: {
  notes: ResolvedAnnotation[];
  userRole: string;
}) {
  const { deleteAnnotation } = useDocuments();
  if (notes.length === 0) return null;

  return (
    <div className="my-2 space-y-2">
      {notes.map(({ annotation, state }) => (
        <div
          key={annotation.id}
          className="rounded-md border border-border border-l-[3px] border-l-chart-3 bg-chart-3/[0.06] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-chart-3">
              Your note
            </span>
            <div className="flex items-center gap-2">
              {state === 'moved' && (
                <Badge variant="outline" className="px-1.5 text-[10px] text-muted-foreground">
                  Text moved
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDateOnly(annotation.createdAtUtc.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => deleteAnnotation(annotation.id, userRole)}
                aria-label="Delete this note"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs italic leading-relaxed text-muted-foreground">
            <mark className="rounded-sm bg-chart-3/25 px-0.5 not-italic text-foreground">
              {annotation.quote}
            </mark>
          </p>
          {annotation.note && <p className="mt-1.5 text-sm leading-relaxed">{annotation.note}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * The orphan list — notes whose text is gone (Phase 4).
 *
 * Surfaced, never silently dropped and never re-attached to different words. A
 * note moved onto text its author never read is worse than one that says it lost
 * its place, because the reader would trust a mark that no longer means what they
 * meant. One study of general web annotations found 27% already orphaned, so this
 * panel is a normal state rather than an edge case.
 */
export function OrphanedNotes({
  orphans,
  userRole,
}: {
  orphans: ResolvedAnnotation[];
  userRole: string;
}) {
  const { deleteAnnotation } = useDocuments();
  const [open, setOpen] = useState(false);
  if (orphans.length === 0) return null;

  return (
    <div className="mb-4 rounded-md border border-border bg-muted/40 p-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 text-left"
      >
        <Unlink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {orphans.length === 1
              ? '1 of your notes lost its place'
              : `${orphans.length} of your notes lost their place`}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            The wording {orphans.length === 1 ? 'it was' : 'they were'} attached to is no longer in this
            revision. {open ? 'Hide' : 'Show'} what you marked.
          </span>
        </span>
      </button>

      {open && (
        <ul className="mt-3 space-y-2 border-t border-border pt-3">
          {orphans.map(({ annotation }) => (
            <li key={annotation.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  You marked this
                </span>
                <button
                  type="button"
                  onClick={() => deleteAnnotation(annotation.id, userRole)}
                  aria-label="Delete this note"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-xs italic leading-relaxed text-muted-foreground">
                &ldquo;{annotation.quote}&rdquo;
              </p>
              {annotation.note && <p className="mt-1.5 text-sm leading-relaxed">{annotation.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Turn a text selection inside the article into a note.
 *
 * The selection is captured as it is MADE, not when the button is pressed —
 * pressing a button collapses the document selection first, so reading it in the
 * click handler finds nothing. Verified the hard way in a browser: the selection
 * was correct, the handler saw none, and nothing happened.
 *
 * The selection is mapped back to the block's markdown source by searching for
 * the selected string. That is imperfect where markdown syntax sits inside the
 * selection — but a selection we cannot map is simply refused, whereas a
 * mis-mapped offset would silently mark the wrong words.
 */
export function AddNoteBar({
  docId,
  rev,
  userRole,
  articleRef,
}: {
  docId: string;
  rev: DocRevision;
  userRole: string;
  articleRef: React.RefObject<HTMLElement | null>;
}) {
  const { addAnnotation } = useDocuments();
  type Candidate = { blockId: string; blockText: string; start: number; end: number; quote: string };
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pending, setPending] = useState<Candidate | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const read = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!sel || !text || text.length < 3) return setCandidate(null);
      const node = sel.anchorNode;
      const host = (node instanceof Element ? node : node?.parentElement)?.closest('[data-block-id]');
      const blockId = host?.getAttribute('data-block-id');
      if (!blockId || !host || !articleRef.current?.contains(host)) return setCandidate(null);
      const block = rev.sections.flatMap((s) => s.blocks).find((b) => b.id === blockId);
      if (!block) return setCandidate(null);
      const start = block.md.indexOf(text);
      // A selection spanning markdown syntax cannot be mapped to the source. Refuse
      // it rather than guess an offset that would mark the wrong words.
      if (start === -1) return setCandidate(null);
      setCandidate({ blockId, blockText: block.md, start, end: start + text.length, quote: text });
    };
    document.addEventListener('selectionchange', read);
    return () => document.removeEventListener('selectionchange', read);
  }, [rev, articleRef]);

  const capture = () => {
    if (!candidate) return;
    setPending(candidate);
    setNote('');
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {candidate
            ? 'Ready to note the wording you selected.'
            : 'Select any wording to keep a private note against it. Your notes are yours alone and never appear in the document.'}
        </p>
        <Button size="sm" variant="outline" onClick={capture} disabled={!candidate}>
          <Highlighter className="h-4 w-4" /> Note the selection
        </Button>
      </div>

      {pending && (
        <div className="mb-3 rounded-md border border-chart-3/50 bg-chart-3/[0.06] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-chart-3">Marking</p>
          <p className="mt-1 text-xs italic leading-relaxed">&ldquo;{pending.quote}&rdquo;</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Your note (optional — leave blank for a plain highlight)"
            className="mt-2"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                addAnnotation({ docId, rev, ...pending, note: note.trim(), userRole });
                setPending(null);
              }}
            >
              Keep note
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
