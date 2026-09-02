import { useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import {
  MAX_ATTACHMENTS,
  describeRejection,
  formatBytes,
  readImageFile,
  selectAcceptable,
} from './attachments';
import type { FeedbackAttachment } from './types';

/**
 * Screenshots in, three ways: paste, drop, browse.
 *
 * Paste is first among equals. The path a person actually takes is Shift-⌘-4 then
 * ⌘V — asking them to save the capture to disk and find it again is where a bug
 * report with evidence turns into a bug report without one.
 */
export function ScreenshotField({
  attachments,
  onChange,
}: {
  attachments: FeedbackAttachment[];
  onChange: (next: FeedbackAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const full = attachments.length >= MAX_ATTACHMENTS;

  async function add(files: File[]) {
    const { accepted, rejected } = selectAcceptable(files, attachments.length);
    const messages = rejected.map(describeRejection);
    const next: FeedbackAttachment[] = [];

    for (const [slot, index] of accepted.entries()) {
      try {
        const read = await readImageFile(files[index], attachments.length + slot);
        next.push({ ...read, id: `att-${Date.now()}-${slot}` });
      } catch (error) {
        messages.push(error instanceof Error ? error.message : 'That image could not be read.');
      }
    }

    setProblems(messages);
    if (next.length) onChange([...attachments, ...next]);
  }

  function remove(id: string) {
    setProblems([]);
    onChange(attachments.filter((a) => a.id !== id));
  }

  return (
    <div
      // The paste listener sits on the field, not on window: a global handler
      // would hijack ⌘V while someone is pasting a tail number into the summary.
      onPaste={(e) => {
        const files = [...e.clipboardData.files];
        if (!files.length) return;
        e.preventDefault();
        void add(files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void add([...e.dataTransfer.files]);
      }}
      tabIndex={0}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gfo-gold,var(--accent))]/50"
    >
      {attachments.length > 0 && (
        <div className="flex gap-2.5 flex-wrap mb-2.5">
          {attachments.map((a) => (
            <figure key={a.id} className="relative m-0">
              <img
                src={a.dataUrl}
                alt={a.name}
                className="w-[74px] h-[54px] object-cover rounded-md border border-border"
              />
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.name}`}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-muted border border-border grid place-items-center hover:bg-accent"
              >
                <X className="w-3 h-3" />
              </button>
              <figcaption className="sr-only">
                {a.name} ({formatBytes(a.size)})
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={full}
        className={`w-full flex items-center gap-3 rounded-lg border border-dashed px-3.5 py-3 text-left transition-colors ${
          over ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/70'
        } ${full ? 'opacity-55 cursor-not-allowed' : ''}`}
      >
        <ImagePlus className="w-[18px] h-[18px] text-muted-foreground shrink-0" strokeWidth={1.5} />
        <span className="text-[12.5px] leading-snug text-muted-foreground">
          {full ? (
            <>That’s {MAX_ATTACHMENTS} — remove one to add another.</>
          ) : (
            <>
              <span className="text-foreground font-medium">Drop an image</span>, press{' '}
              <kbd className="border border-border rounded px-1 py-[1px] text-[10.5px] text-foreground">
                ⌘V
              </kbd>{' '}
              to paste, or click to browse. Up to {MAX_ATTACHMENTS}.
            </>
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void add([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />

      {problems.length > 0 && (
        <ul className="mt-2 text-[12px] text-[color:var(--gfo-error)] leading-snug list-none p-0 m-0">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
