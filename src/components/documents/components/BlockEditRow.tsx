import { useRef } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Scissors, ArrowUpToLine, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import type { DocBlock } from '../types';
import { REG_CATALOG } from '../engine/regCatalog';
import { ComplianceBadges } from './ComplianceBadges';

/** One editable block: a markdown textarea + structural controls + regulation
 * linking. Splitting at the caret keeps the head, moves the tail into a new block. */
export function BlockEditRow({
  block, index, onEditMd, onSplit, onMergeUp, onMove, onAddAfter, onDelete, onSetRefs, canMergeUp, canMoveUp, canMoveDown,
}: {
  block: DocBlock;
  index: number;
  onEditMd: (md: string) => void;
  onSplit: (caretMd: string, restMd: string) => void;
  onMergeUp: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onAddAfter: () => void;
  onDelete: () => void;
  onSetRefs: (refs: string[]) => void;
  canMergeUp: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  // The shared ui Textarea is a plain (non-forwardRef) React-18 component, so we
  // read the caret from the DOM textarea via the row wrapper instead of a ref on it.
  const wrapRef = useRef<HTMLDivElement>(null);
  const refs = block.complianceRefs ?? [];

  const splitAtCaret = () => {
    const el = wrapRef.current?.querySelector('textarea');
    const pos = el?.selectionStart ?? block.md.length;
    onSplit(block.md.slice(0, pos).trimEnd(), block.md.slice(pos).trimStart());
  };

  const toggleRef = (id: string) => onSetRefs(refs.includes(id) ? refs.filter((r) => r !== id) : [...refs, id]);

  return (
    <div ref={wrapRef} className="group relative rounded-md border border-border bg-card p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{block.type}{block.calloutKind ? ` · ${block.calloutKind}` : ''}</span>
        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className={`h-6 w-6 ${refs.length ? 'text-indigo-600 dark:text-indigo-400' : ''}`} aria-label="Link regulation">
                <ShieldCheck className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <p className="border-b border-border px-3 py-2 text-xs font-medium">Regulations this block satisfies</p>
              <div className="max-h-72 overflow-y-auto p-1">
                {REG_CATALOG.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                    <Checkbox checked={refs.includes(r.id)} onCheckedChange={() => toggleRef(r.id)} className="mt-0.5" />
                    <span><span className="font-medium">{r.ref}</span> <span className="text-xs text-muted-foreground">· {r.authority} · {r.title}</span></span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
        placeholder="Block markdown (GFM). Use `> [!WARNING]` for a callout, `![alt](src)` for a figure, `[!STEP]` for a numbered step (put its photo on the next line; numbering is automatic)."
        aria-label={`Block ${index + 1} content`}
      />
      <ComplianceBadges refs={block.complianceRefs} />
    </div>
  );
}
