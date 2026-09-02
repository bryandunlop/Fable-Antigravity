// The frozen trip sheet (D106): a versioned page with a PDF button, and "send to crew".

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { changedSinceFreeze, freezeSheet, frozenSheets, sendSheetToCrew, type FrozenSheet } from '../engine/tripSheet';
import { formatEt } from '../engine/cutoffs';
import { formatElapsed } from '../../../services/legTime';

function longDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}
const z = (iso: string) => `${iso.slice(11, 16)}Z`;

export default function TripSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, actor, sheetCtx, update, nowUtc } = useTripsModule();
  const trip = trips.find(t => t.id === id);
  const versions = trip ? frozenSheets(trip) : [];
  const [pick, setPick] = useState<number | null>(null);
  const sheet: FrozenSheet | undefined = versions.find(v => v.version === pick) ?? versions.at(-1);

  if (!trip) return <div className="p-6"><GfoPanel><p className="text-sm text-muted-foreground">Not visible to you.</p></GfoPanel></div>;
  if (!sheet) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4 p-6">
        <GfoPageHeader eyebrow="Trip sheet" title={trip.title} />
        <GfoPanel><p className="text-sm text-muted-foreground">Nothing frozen yet. The sheet freezes at T-72; scheduling can freeze it early from the trip page.</p></GfoPanel>
      </div>
    );
  }

  const isSched = actor.role === 'scheduling';
  const stale = changedSinceFreeze(trip, sheetCtx, nowUtc(), actor);
  const sentEvents = trip.events.filter(e => e.kind === 'sent-to-crew' && e.version === sheet.version);

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-6 print:max-w-none print:p-0">
      <style>{`@media print { nav, aside, header, .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-print">
        <GfoPageHeader
          eyebrow={<button onClick={() => navigate(`/trips/${trip.id}`)} className="inline-flex items-center gap-1 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to the trip</button> as unknown as string}
          title="Trip sheet"
          description={`Frozen ${formatEt(sheet.frozenAtUtc)} by ${sheet.frozenBy} · version ${sheet.version} of ${versions.length}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {versions.length > 1 && (
                <select className="h-9 rounded-md border border-border bg-input-background px-2 text-sm" value={sheet.version} onChange={e => setPick(Number(e.target.value))} aria-label="Version">
                  {versions.map(v => <option key={v.version} value={v.version}>v{v.version} · {formatEt(v.frozenAtUtc)}</option>)}
                </select>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />PDF</Button>
              {isSched && (
                <Button size="sm" onClick={() => update(trip.id, t => sendSheetToCrew(t, actor, nowUtc()))}><Send className="mr-1.5 h-4 w-4" />Send to crew</Button>
              )}
              {isSched && stale && (
                <Button size="sm" variant="outline" onClick={() => { update(trip.id, t => freezeSheet(t, sheetCtx, nowUtc(), actor)); setPick(null); }}>Refreeze as v{versions.length + 1}</Button>
              )}
            </div>
          }
        />
        {stale && <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-400">The trip has changed since this version was frozen. This sheet still says what it said; scheduling can refreeze.</p>}
        {sentEvents.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Sent to crew {sentEvents.map(e => formatEt(e.at)).join(', ')} · the EFB push is Phase 2</p>}
      </div>

      <GfoPanel>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="gfo-eyebrow text-muted-foreground">Global Flight Operations · trip sheet · v{sheet.version}</div>
            <h2 className="text-xl font-semibold text-primary">{sheet.title}</h2>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{sheet.tail ?? 'aircraft TBA'}</div>
            <div className="text-muted-foreground">Lead {sheet.lead} · frozen {formatEt(sheet.frozenAtUtc)}</div>
          </div>
        </div>

        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 pr-3">Leg</th><th className="py-1.5 pr-3">Depart</th><th className="py-1.5 pr-3">Arrive</th><th className="py-1.5 pr-3">Block</th><th className="py-1.5">Aboard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sheet.legs.map(l => (
              <tr key={l.n} className="align-top">
                <td className="py-2 pr-3"><div className="font-medium">Leg {l.n}</div><div className="text-xs text-muted-foreground">{longDate(l.date)}</div></td>
                <td className="py-2 pr-3"><div className="font-medium">{l.from.label}</div><div className={cn('text-xs', l.planned ? 'text-amber-800 dark:text-amber-400' : 'text-muted-foreground')}>{l.from.wall ?? '—'} · {z(l.from.utc)}{l.planned ? ' · planning time' : ''}</div></td>
                <td className="py-2 pr-3"><div className="font-medium">{l.to.label}</div><div className="text-xs text-muted-foreground">{l.to.wall ?? '—'} · {z(l.to.utc)}{l.dayShift ? ` +${l.dayShift}` : ''}</div></td>
                <td className="py-2 pr-3 tabular-nums">{formatElapsed(l.elapsedMinutes)}</td>
                <td className="py-2">{l.aboard.join(' · ')}{l.catering && <div className="text-xs text-muted-foreground">Catering: {l.catering}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="gfo-eyebrow mb-1 text-muted-foreground">Crew</div>
            {sheet.crew.length === 0 && <p className="text-sm text-muted-foreground">Not yet assigned.</p>}
            <ul className="space-y-1 text-sm">{sheet.crew.map(c => <li key={c.role}><span className="font-medium">{c.role}</span> {c.name}{c.blurb && <span className="text-muted-foreground"> — {c.blurb}</span>}</li>)}</ul>
          </div>
          <div>
            <div className="gfo-eyebrow mb-1 text-muted-foreground">Documents on the trip at freeze</div>
            {sheet.documents.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="space-y-1 text-sm">{sheet.documents.map(d => <li key={d}>{d}</li>)}</ul>}
          </div>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Generated from the trip record. Nothing on this sheet was typed by hand; a change after the freeze produces a new version, never an edit to this one.</p>
      </GfoPanel>
    </div>
  );
}
