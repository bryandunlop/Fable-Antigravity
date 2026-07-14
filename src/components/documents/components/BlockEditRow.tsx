import { useRef } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Scissors, ArrowUpToLine } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import type { DocBlock } from '../types';

/** One editable block: a markdown textarea + structural controls. Splitting at
 * the caret keeps the head, moves the tail into a new block. */
export function BlockEditRow({
  block, index, onEditMd, onSplit, onMergeUp, onMove, onAddAfter, onDelete, canMergeUp, canMoveUp, canMoveDown,
}: {
  block: DocBlock;
  index: number;
  onEditMd: (md: string) => void;
  onSplit: (caretMd: string, restMd: string) => void;
  onMergeUp: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onAddAfter: () => void;
  onDelete: () => void;
  canMergeUp: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  // The shared ui Textarea is a plain (non-forwardRef) React-18 component, so we
  // read the caret from the DOM textarea via the row wrapper instead of a ref on it.
  const wrapRef = useRef<HTMLDivElement>(null);

  const splitAtCaret = () => {
    const el = wrapRef.current?.querySelector('textarea');
    const pos = el?.selectionStart ?? block.md.length;
    onSplit(block.md.slice(0, pos).trimEnd(), block.md.slice(pos).trimStart());
  };

  return (
    <div ref={wrapRef} className="group relative rounded-md border border-border bg-card p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{block.type}{block.calloutKind ? ` · ${block.calloutKind}` : ''}</span>
        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Move block up" disabled={!canMoveUp} onClick={() => onMove('up')}><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Move block down" disabled={!canMoveDown} onClick={() => onMove('down')}><ChevronDown className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Split block at caret" onClick={splitAtCaret}><Scissors className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Merge into previous block" disabled={!canMergeUp} onClick={onMergeUp}><ArrowUpToLine className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Add block below" onClick={onAddAfter}><Plus className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label="Delete block" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <Textarea
        value={block.md}
        onChange={(e) => onEditMd(e.target.value)}
        rows={Math.max(2, block.md.split('\n').length)}
        className="font-mono text-xs"
        placeholder="Block markdown (GFM). Use `> [!WARNING]` for a callout, `![alt](src)` for a figure."
        aria-label={`Block ${index + 1} content`}
      />
    </div>
  );
}
