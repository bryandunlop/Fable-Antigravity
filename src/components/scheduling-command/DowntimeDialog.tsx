import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { MaintenanceDowntimeBlock } from '../../availability/types';

/**
 * Book a maintenance window. The END DATE IS REQUIRED and is the whole point of the dialog: it is
 * the return-to-service date the fleet has never had, so a grounded tail stops reading
 * down-forever on every availability surface (LG-308).
 *
 * Fields mirror myairops MaintenanceEntryModel, so a block booked here and one pulled from
 * myairops in Phase 2 are the same shape. Description, vendor and work order are OPERATOR-ONLY —
 * they never reach an executive.
 */
export function DowntimeDialog({
  open,
  tail,
  tails,
  nowUtc,
  onClose,
  onSave,
}: {
  open: boolean;
  tail: string | null;
  tails: string[];
  nowUtc: string;
  onClose: () => void;
  onSave: (block: MaintenanceDowntimeBlock) => void;
}) {
  const today = nowUtc.slice(0, 10);
  const [form, setForm] = useState({
    tail: tail ?? tails[0] ?? '',
    maintenanceType: 'Scheduled inspection',
    startDate: today,
    endDate: today,
    airportIcao: 'KLUK',
    vendorName: '',
    woNumber: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const activeTail = tail ?? form.tail;

  function save() {
    if (!activeTail) return setError('Pick an aircraft.');
    if (!form.endDate) return setError('A return-to-service date is required.');
    if (form.endDate < form.startDate) return setError('The return date cannot be before the start.');
    setError(null);
    onSave({
      id: `mx-local-${activeTail}-${form.startDate}-${Date.now()}`,
      tail: activeTail,
      maintenanceType: form.maintenanceType,
      category: null,
      description: form.description || null,
      airportIcao: form.airportIcao || null,
      vendorName: form.vendorName || null,
      woNumber: form.woNumber || null,
      scheduledStartUtc: `${form.startDate}T08:00:00.000Z`,
      scheduledEndUtc: `${form.endDate}T18:00:00.000Z`,
      actualStartUtc: null,
      actualEndUtc: null,
      cancelled: false,
      released: false,
      createdBy: 'scheduling',
      createdAtUtc: nowUtc,
      modifiedBy: null,
      modifiedAtUtc: null,
      source: 'local',
      sourceRef: null,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book a maintenance window</DialogTitle>
          <DialogDescription>
            Executives and EAs will see “In maintenance until {form.endDate || '—'}” — the date, and
            nothing else.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {!tail && (
            <div className="grid gap-1.5">
              <Label htmlFor="dt-tail">Aircraft</Label>
              <select
                id="dt-tail"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.tail}
                onChange={e => setForm({ ...form, tail: e.target.value })}
              >
                {tails.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="dt-type">Type of work</Label>
            <Input id="dt-type" value={form.maintenanceType}
              onChange={e => setForm({ ...form, maintenanceType: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dt-start">Starts</Label>
              <Input id="dt-start" type="date" value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dt-end">Back in service <span className="text-destructive">*</span></Label>
              <Input id="dt-end" type="date" value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="dt-airport">Location</Label>
              <Input id="dt-airport" value={form.airportIcao}
                onChange={e => setForm({ ...form, airportIcao: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dt-wo">Work order</Label>
              <Input id="dt-wo" value={form.woNumber}
                onChange={e => setForm({ ...form, woNumber: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="dt-vendor">Vendor</Label>
            <Input id="dt-vendor" value={form.vendorName}
              onChange={e => setForm({ ...form, vendorName: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="dt-desc">Notes <span className="text-muted-foreground">(internal)</span></Label>
            <Textarea id="dt-desc" rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Book the window</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
