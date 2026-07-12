import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { GfoPanel } from '../../gfo';
import type { FirAction } from '../reducer';
import type { FirImpact, FlightIrregularityReport } from '../types';

interface Props {
  fir: FlightIrregularityReport;
  canEdit: boolean;
  /** Sum of debrief elapsed-hours — offered as the default downtime, owner can override. */
  derivedDowntimeHours?: number;
  dispatch: React.Dispatch<FirAction>;
}

const numOrUndef = (v: string): number | undefined => (v === '' ? undefined : Number(v));

export function ImpactTab({ fir, canEdit, derivedDowntimeHours, dispatch }: Props) {
  const [draft, setDraft] = useState<FirImpact>(fir.impact);
  useEffect(() => { setDraft(fir.impact); }, [fir.id, fir.impact]);

  const shownDowntime = fir.impact.downtimeHours ?? derivedDowntimeHours;

  if (!canEdit) {
    const rows: [string, string | number | undefined][] = [
      ['Downtime', shownDowntime != null ? `${shownDowntime} h` : undefined],
      ['Delay', fir.impact.delayMinutes != null ? `${fir.impact.delayMinutes} min` : undefined],
      ['Trips affected', fir.impact.tripsAffected],
      ['Cost note', fir.impact.costNote],
    ];
    const any = rows.some(([, v]) => v != null && v !== '');
    return (
      <GfoPanel title="Impact">
        {any ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No impact recorded yet.</p>
        )}
      </GfoPanel>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(fir.impact);
  return (
    <GfoPanel
      title="Impact"
      action={
        <Button size="sm" onClick={() => dispatch({ type: 'UPDATE_IMPACT', payload: { firId: fir.id, impact: draft } })} disabled={!dirty}>
          <Save className="mr-1.5 h-4 w-4" /> Save
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="imp-downtime" className="text-xs">Downtime (h)</Label>
          <Input id="imp-downtime" type="number" min="0" className="mt-1"
            value={draft.downtimeHours ?? ''}
            placeholder={derivedDowntimeHours != null ? `${derivedDowntimeHours} (from debrief)` : ''}
            onChange={e => setDraft(d => ({ ...d, downtimeHours: numOrUndef(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="imp-delay" className="text-xs">Delay (min)</Label>
          <Input id="imp-delay" type="number" min="0" className="mt-1"
            value={draft.delayMinutes ?? ''}
            onChange={e => setDraft(d => ({ ...d, delayMinutes: numOrUndef(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="imp-trips" className="text-xs">Trips affected</Label>
          <Input id="imp-trips" type="number" min="0" className="mt-1"
            value={draft.tripsAffected ?? ''}
            onChange={e => setDraft(d => ({ ...d, tripsAffected: numOrUndef(e.target.value) }))} />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="imp-cost" className="text-xs">Cost note</Label>
        <Textarea id="imp-cost" rows={3} className="mt-1"
          value={draft.costNote ?? ''}
          onChange={e => setDraft(d => ({ ...d, costNote: e.target.value || undefined }))}
          placeholder="Free text — e.g. repositioning flight, crew hotel, vendor AOG freight. No cost engine in v1." />
      </div>
      {derivedDowntimeHours != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Downtime defaults to {derivedDowntimeHours} h from the anchored debrief; override above if the operational number differs.
        </p>
      )}
    </GfoPanel>
  );
}
