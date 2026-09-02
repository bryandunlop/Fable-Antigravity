// Scheduling's places register — "Seattle means Boeing Field". Scheduler-curated (D105).

import { useState } from 'react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { addAirport, addPlace, setUsual, type PlaceKind } from '../engine/places';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export default function PlacesAdmin() {
  const { places, setPlaces, actor } = useTripsModule();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaceKind>('plant');
  const [aliases, setAliases] = useState('');
  const [newAirport, setNewAirport] = useState<Record<string, { icao: string; name: string }>>({});
  const canEdit = actor.role === 'scheduling';

  function add() {
    if (!name.trim()) return;
    setPlaces(addPlace(places, { name, kind, aliases: aliases.split(',').map(s => s.trim()).filter(Boolean) }));
    setName(''); setAliases('');
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-6">
      <GfoPageHeader eyebrow="Scheduling · reference" title="Places" description="What an EA types, and the airport this department actually uses for it. The usual field is offered first; the EA can pick another or leave it to you." />
      {canEdit && (
        <GfoPanel title="Add a place">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]">
            <input className={field} placeholder="Lima plant" value={name} onChange={e => setName(e.target.value)} aria-label="Place name" />
            <select className={field} value={kind} onChange={e => setKind(e.target.value as PlaceKind)} aria-label="Kind"><option value="plant">plant</option><option value="city">city</option><option value="site">site</option></select>
            <input className={field} placeholder="aliases, comma separated" value={aliases} onChange={e => setAliases(e.target.value)} aria-label="Aliases" />
            <Button onClick={add}>Add</Button>
          </div>
        </GfoPanel>
      )}
      <GfoPanel title={`${places.length} places`}>
        <ul className="divide-y divide-border">
          {places.map(p => (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-primary">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.kind}{p.aliases.length ? ` · also "${p.aliases.join('", "')}"` : ''}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {p.airports.map(a => (
                  <button key={a.icao} type="button" disabled={!canEdit} title={canEdit ? 'Make this the usual field' : a.note}
                    onClick={() => setPlaces(setUsual(places, p.id, a.icao))}
                    className={cn('rounded-md border px-2 py-0.5 text-xs', a.usual ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary')}>
                    {a.name} · {a.icao}{a.usual && <span className="ml-1 opacity-80">usual</span>}
                  </button>
                ))}
                {p.airports.length === 0 && <span className="text-xs text-destructive">No airport yet — an EA picking this place will be asked.</span>}
                {canEdit && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <input className={`${field} h-7 w-16 px-2 text-xs uppercase`} placeholder="ICAO" value={newAirport[p.id]?.icao ?? ''} aria-label={`New airport code for ${p.name}`}
                      onChange={e => setNewAirport(s => ({ ...s, [p.id]: { icao: e.target.value.toUpperCase(), name: s[p.id]?.name ?? '' } }))} />
                    <input className={`${field} h-7 w-44 px-2 text-xs`} placeholder="Airport name" value={newAirport[p.id]?.name ?? ''} aria-label={`New airport name for ${p.name}`}
                      onChange={e => setNewAirport(s => ({ ...s, [p.id]: { icao: s[p.id]?.icao ?? '', name: e.target.value } }))} />
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                      const n = newAirport[p.id]; if (!n?.icao) return;
                      setPlaces(addAirport(places, p.id, { icao: n.icao, name: n.name || n.icao, usual: false }));
                      setNewAirport(s => ({ ...s, [p.id]: { icao: '', name: '' } }));
                    }}>Add</Button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </GfoPanel>
    </div>
  );
}
