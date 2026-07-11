import { useState } from 'react';
import { Fuel } from 'lucide-react';
import type { Aircraft, FuelLoadEntry, TechLogState } from '../../types';
import { findNextFinalizedLeg, requiresFuelFarmSubmission } from '../../engine/fuel';
import { useCurrentUser } from '../../TechLogContext';
import { newId } from '../../util/id';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';

export function FuelLoadStep({
  aircraft, state, value, onChange,
}: {
  aircraft: Aircraft;
  state: Pick<TechLogState, 'trips'>;
  value?: FuelLoadEntry;
  onChange: (next: FuelLoadEntry) => void;
}) {
  const user = useCurrentUser();
  const nowUtc = new Date().toISOString();
  const nextLeg = findNextFinalizedLeg(aircraft.id, state, nowUtc);
  const [loadedLb, setLoadedLb] = useState(String(value?.loadedLb ?? ''));
  const [loadedGal, setLoadedGal] = useState(String(value?.loadedGal ?? ''));

  const choose = (source: 'NEXT_FLIGHT' | 'STANDBY') => {
    const targetLb = source === 'NEXT_FLIGHT' ? (nextLeg?.plannedFuelLb ?? 0) : (aircraft.standbyFuelLoadLb ?? 0);
    const atHome = source === 'NEXT_FLIGHT' && nextLeg ? requiresFuelFarmSubmission(nextLeg, aircraft) : false;
    onChange({
      source, targetLb, recordedByOid: user.oid,
      loadedLb: value?.loadedLb, loadedGal: value?.loadedGal,
      fuelRequestId: atHome ? newId('fr') : undefined,
    });
  };

  const saveActual = () => {
    if (!value) return;
    onChange({ ...value, loadedLb: loadedLb ? Number(loadedLb) : undefined, loadedGal: loadedGal ? Number(loadedGal) : undefined });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Fuel className="h-4 w-4" /> Load fuel <Badge variant="outline" className="ml-1">optional</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-col gap-2">
          <button
            type="button" disabled={!nextLeg} onClick={() => choose('NEXT_FLIGHT')}
            className={`rounded-lg border p-3 text-left ${value?.source === 'NEXT_FLIGHT' ? 'border-2' : ''} disabled:opacity-50`}
            style={value?.source === 'NEXT_FLIGHT' ? { borderColor: 'var(--gfo-daylight,#0096FC)' } : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Next flight{nextLeg ? ` · ${nextLeg.departureIcao} → ${nextLeg.arrivalIcao}` : ''}</span>
              <span>{nextLeg?.plannedFuelLb ? `${nextLeg.plannedFuelLb.toLocaleString()} lb` : '—'}</span>
            </div>
            <div className="text-xs text-muted-foreground">{nextLeg ? 'crew-finalized load' : 'no finalized next leg yet'}</div>
          </button>
          <button
            type="button" onClick={() => choose('STANDBY')}
            className={`rounded-lg border p-3 text-left ${value?.source === 'STANDBY' ? 'border-2' : ''}`}
            style={value?.source === 'STANDBY' ? { borderColor: 'var(--gfo-daylight,#0096FC)' } : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Standby load</span>
              <span>{aircraft.standbyFuelLoadLb ? `${aircraft.standbyFuelLoadLb.toLocaleString()} lb` : 'not set'}</span>
            </div>
            <div className="text-xs text-muted-foreground">tail default when no trip is final</div>
          </button>
        </div>
        {value && (
          <div className="flex flex-wrap items-end gap-2">
            <div><label className="block text-xs text-muted-foreground">Loaded (lb)</label><Input className="w-28" inputMode="numeric" value={loadedLb} onChange={e => setLoadedLb(e.target.value)} onBlur={saveActual} /></div>
            <div><label className="block text-xs text-muted-foreground">Gallons</label><Input className="w-28" inputMode="numeric" value={loadedGal} onChange={e => setLoadedGal(e.target.value)} onBlur={saveActual} /></div>
            {value.fuelRequestId && <Badge variant="outline">fuel-farm submission {value.fuelRequestId}</Badge>}
            <Button size="sm" variant="ghost" onClick={saveActual}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
