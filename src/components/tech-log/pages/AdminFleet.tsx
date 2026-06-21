import { useState } from 'react';
import { toast } from 'sonner';
import { Plane, Pencil, BadgeCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { newId } from '../util/id';
import type { Aircraft, AircraftType, AircraftStatus } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export default function AdminFleet() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canEdit = user.role === 'MAINTENANCE';
  const [draft, setDraft] = useState<Aircraft | null>(null);

  const save = () => {
    if (!draft) return;
    if (!draft.tailNumber.trim() || !draft.serialNumber.trim()) return toast.error('Tail and serial are required.');
    dispatch({ type: 'EDIT_AIRCRAFT', payload: draft });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'AIRCRAFT_EDITED', entityType: 'Aircraft', entityId: draft.id, atUtc: new Date().toISOString(), summary: `Edited ${draft.tailNumber} (S/N ${draft.serialNumber})` } });
    toast.success(`Saved ${draft.tailNumber}.`);
    setDraft(null);
  };

  const activate = (ac: Aircraft) => {
    dispatch({ type: 'EDIT_AIRCRAFT', payload: { ...ac, isProvisional: false, status: 'ACTIVE' } });
    state.melItems.filter(m => m.aircraftType === ac.type && m.approvalState !== 'APPROVED').forEach(m =>
      dispatch({ type: 'EDIT_MEL_ITEM', payload: { ...m, approvalState: 'APPROVED' } }),
    );
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'TYPE_ACTIVATED', entityType: 'Aircraft', entityId: ac.id, atUtc: new Date().toISOString(), summary: `${ac.type} D195 approved — ${ac.tailNumber} activated, deferrals enabled` } });
    toast.success(`${ac.type} D195 approved — ${ac.tailNumber} is now in service. Deferrals enabled.`);
  };

  return (
    <TechLogShell title="Admin · Fleet" subtitle="Reference data — editable in-app (configurable, not locked-in).">
      <div className="space-y-3">
        {state.aircraft.map(ac => (
          <Card key={ac.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Plane className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 font-semibold">{ac.tailNumber}
                    <Badge variant="outline">{ac.type}</Badge>
                    <Badge variant={ac.isProvisional ? 'destructive' : 'secondary'}>{ac.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">S/N {ac.serialNumber} · {ac.homeBase} · {ac.airframeTotalHours}h / {ac.airframeTotalCycles} cyc</div>
                </div>
              </div>
              <div className="flex gap-2">
                {ac.isProvisional && canEdit && (
                  <Button size="sm" onClick={() => activate(ac)}><BadgeCheck className="mr-1.5 h-4 w-4" /> Approve D195 &amp; activate</Button>
                )}
                <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setDraft({ ...ac })}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={o => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit aircraft</DialogTitle><DialogDescription>Updatable reference data (versioned in production).</DialogDescription></DialogHeader>
          {draft && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tail number</Label><Input className="mt-1" value={draft.tailNumber} onChange={e => setDraft({ ...draft, tailNumber: e.target.value })} /></div>
                <div><Label>Serial number</Label><Input className="mt-1" value={draft.serialNumber} onChange={e => setDraft({ ...draft, serialNumber: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={draft.type} onValueChange={(v: string) => setDraft({ ...draft, type: v as AircraftType })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['G650ER', 'G500', 'G800'] as AircraftType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v: string) => setDraft({ ...draft, status: v as AircraftStatus, isProvisional: v === 'PROVISIONAL' })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['ACTIVE', 'PROVISIONAL', 'STORED', 'SOLD'] as AircraftStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Home base</Label><Input className="mt-1" value={draft.homeBase} onChange={e => setDraft({ ...draft, homeBase: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
