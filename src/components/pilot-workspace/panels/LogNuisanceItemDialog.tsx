import { useState } from 'react';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { ATA_CHAPTERS } from '../../tech-log/constants';
import { newId } from '../../tech-log/util/id';
import type { Aircraft, IntermittentFault, IntermittentFaultOccurrence } from '../../tech-log/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';

/**
 * In-place "log a nuisance item" for the pilot — the same monitoring-only intermittent-fault record
 * the tech-log Intermittent page creates, but without leaving the pilot workspace. The aircraft is
 * fixed to the trip's tail (no picker), so the pilot never crosses into the tech-log environment.
 */
export function LogNuisanceItemDialog({
  open, onOpenChange, aircraft,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  aircraft: Aircraft;
}) {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();
  const [ata, setAta] = useState('31');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const reset = () => { setAta('31'); setTitle(''); setNote(''); };
  const close = () => { reset(); onOpenChange(false); };

  const create = () => {
    if (!title.trim()) { toast.error('A short title is required.'); return; }
    const now = new Date().toISOString();
    const fault: IntermittentFault = {
      id: newId('if'), aircraftId: aircraft.id, ataChapter: ata, title: title.trim(),
      description: note.trim() || undefined, status: 'MONITORING', firstObservedUtc: now, createdByOid: user.oid,
    };
    const occ: IntermittentFaultOccurrence = {
      id: newId('ifo'), faultId: fault.id, aircraftId: aircraft.id, observedAtUtc: now,
      observedByOid: user.oid, note: note.trim() || undefined,
    };
    dispatch({ type: 'ADD_INTERMITTENT_FAULT', payload: fault });
    dispatch({ type: 'ADD_INTERMITTENT_OCCURRENCE', payload: occ });
    dispatch({ type: 'ADD_AUDIT', payload: {
      id: newId('aud'), actorOid: user.oid, action: 'INTERMITTENT_LOGGED', entityType: 'IntermittentFault',
      entityId: fault.id, atUtc: now, summary: `${aircraft.tailNumber} ATA ${ata} intermittent: ${fault.title}`,
    } });
    toast.success('Nuisance item logged (monitoring — does not affect dispatch).');
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Log nuisance item</DialogTitle>
          <DialogDescription>{aircraft.tailNumber} · captured for monitoring/troubleshooting; does not ground the aircraft.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label>ATA chapter</Label>
            <Select value={ata} onValueChange={(v: string) => setAta(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Title</Label><Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Nuisance MAINT CAS at TOD" /></div>
          <div><Label>What did you see?</Label><Textarea className="mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="Conditions, duration, what cleared it…" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={create}>Log item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
