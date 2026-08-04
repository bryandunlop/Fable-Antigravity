import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useDocuments } from '../DocumentsContext';
import { cabinSections, validateCabinSections, docsInCabinSection } from '../engine/cabinSections';

interface Row {
  /** The name this row had when the dialog opened. Empty for a row added in this session.
   *  This is what turns an edit into a RENAME rather than a delete-plus-add — without it a
   *  retitled section would look like the old one vanishing, and every entry filed under it
   *  would be stranded. */
  original: string;
  name: string;
  key: string;
}

/**
 * D75 / LG-183 — edit the cabin shelf's section vocabulary.
 *
 * Sections are pure vocabulary (`Doc.category` values), which is why they get an editor at all
 * while fleet type does not: `AircraftType` is load-bearing for MEL items and serviceability, so
 * the form derives it from the real fleet instead.
 *
 * The dialog's whole job is to make the two destructive cases visible BEFORE they happen: a
 * rename shows how many entries will move with it, and a section that still holds entries cannot
 * be removed at all.
 */
export function CabinSectionsDialog({
  open,
  onOpenChange,
  actorRoles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actorRoles: string[];
}) {
  const { state, setCabinSections } = useDocuments();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    setRows(cabinSections(state).map((s, i) => ({ original: s, name: s, key: `s${i}` })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const countFor = (original: string) => (original ? docsInCabinSection(state.docs, original).length : 0);

  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[i], next[to]] = [next[to], next[i]];
    setRows(next);
  };

  const remove = (i: number) => {
    const row = rows[i];
    const held = countFor(row.original);
    if (held > 0) {
      toast.error(`"${row.original}" still holds ${held} ${held === 1 ? 'entry' : 'entries'}. Move or archive them first.`);
      return;
    }
    setRows(rows.filter((_, x) => x !== i));
  };

  const save = () => {
    const names = rows.map((r) => r.name.trim());
    const v = validateCabinSections(names);
    if (!v.ok) {
      toast.error(v.error!);
      return;
    }
    const renames: Record<string, string> = {};
    let moved = 0;
    for (const r of rows) {
      const next = r.name.trim();
      if (r.original && next !== r.original) {
        renames[r.original] = next;
        moved += countFor(r.original);
      }
    }
    setCabinSections(names, renames, actorRoles);
    toast.success(moved > 0 ? `Sections saved — ${moved} ${moved === 1 ? 'entry' : 'entries'} moved.` : 'Sections saved.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cabin sections</DialogTitle>
          <DialogDescription>
            Add, rename or reorder the headings on the cabin shelf. Renaming carries its entries
            with it; a section still holding entries can’t be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((row, i) => {
            const held = countFor(row.original);
            const renamed = !!row.original && row.name.trim() !== row.original;
            return (
              <div key={row.key} className="rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.name}
                    onChange={(e) => setRows(rows.map((r, x) => (x === i ? { ...r, name: e.target.value } : r)))}
                    aria-label={`Section ${i + 1} name`}
                    placeholder="Section name"
                    className="h-8 flex-1 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move section ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`Remove section ${i + 1}`} onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 pl-1 text-xs text-muted-foreground">
                  {held === 0 ? 'No entries' : `${held} ${held === 1 ? 'entry' : 'entries'}`}
                  {renamed && held > 0 && ` — will move to “${row.name.trim()}”`}
                  {renamed && held === 0 && ' — renaming'}
                </p>
              </div>
            );
          })}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setRows([...rows, { original: '', name: '', key: `new-${rows.length}-${Math.random().toString(36).slice(2, 8)}` }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add section
        </Button>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save sections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
