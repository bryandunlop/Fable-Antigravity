import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { SchedulerOverlay } from '../../availability/types';

/**
 * Place a hold — scheduling's declared inventory on top of the derived picture.
 *
 * Two fields, deliberately different in kind: the note is internal and the public label is what an
 * executive reads. Writing the public sentence here, next to the private reason, is what keeps a
 * hold from appearing as an unexplained gap on the fleet week.
 *
 * There is no raw release control. Releasing against the engine is approved from a suggestion (see
 * ReleaseSuggestions), so a release always carries a reason the engine itself put forward.
 */
export function HoldDialog({
  open,
  tail,
  fromDateUtc,
  nowUtc,
  actor,
  onClose,
  onSave,
}: {
  open: boolean;
  tail: string;
  fromDateUtc: string;
  nowUtc: string;
  actor: { name: string; role: string };
  onClose: () => void;
  onSave: (overlay: SchedulerOverlay) => void;
}) {
  const [form, setForm] = useState({
    from: fromDateUtc,
    to: fromDateUtc,
    reasonNote: '',
    publicLabel: 'Held by scheduling',
  });
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!form.reasonNote.trim()) return setError('Say why, so the next scheduler knows.');
    if (form.to < form.from) return setError('The end of the hold cannot be before the start.');
    setError(null);
    onSave({
      id: `ov-hold-${tail}-${form.from}-${Date.now()}`,
      kind: 'hold',
      tail,
      fromDateUtc: form.from,
      toDateUtc: form.to,
      reasonNote: form.reasonNote.trim(),
      publicLabel: form.publicLabel.trim() || null,
      createdBy: actor.name,
      createdByRole: actor.role,
      createdAtUtc: nowUtc,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hold {tail}</DialogTitle>
          <DialogDescription>
            The aircraft stays off the executive view for these days. A hold never covers
            maintenance or a committed trip — those outrank it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="h-from">From</Label>
              <Input id="h-from" type="date" value={form.from}
                onChange={e => setForm({ ...form, from: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="h-to">To</Label>
              <Input id="h-to" type="date" value={form.to}
                onChange={e => setForm({ ...form, to: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="h-note">Why <span className="text-muted-foreground">(internal)</span></Label>
            <Textarea id="h-note" rows={2} placeholder="Board week — CEO travel likely, do not release until the agenda is fixed."
              value={form.reasonNote}
              onChange={e => setForm({ ...form, reasonNote: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="h-public">What executives see</Label>
            <Input id="h-public" value={form.publicLabel}
              onChange={e => setForm({ ...form, publicLabel: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              This exact sentence appears on the fleet week. Nothing from the note above does.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Place the hold</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
