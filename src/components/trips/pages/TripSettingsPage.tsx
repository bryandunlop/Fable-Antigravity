// Trip settings — everything the users edit at the end (D106): cutoff defaults, the dead-man
// timer, the email template, crew blurbs, passenger preferences. Scheduling only.

import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { useTripsModule } from '../TripsContext';
import { principalOf, setPrincipal, upsertPerson, type BriefingPrefValue } from '../engine/people';
import { DEFAULT_SETTINGS } from '../data/settingsStore';
import type { TemplateBlock } from '../engine/briefingEmail';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export default function TripSettingsPage() {
  const { settings, setSettings, actor, people, setPeople } = useTripsModule();
  const canEdit = actor.role === 'scheduling';
  const s = settings;

  function num(label: string, value: number, onChange: (n: number) => void, unit: string) {
    return (
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="flex items-center gap-1.5"><input type="number" min={0} className={`${field} w-20 text-right`} value={value} disabled={!canEdit} onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))} aria-label={label} /><span className="w-10 text-xs text-muted-foreground">{unit}</span></span>
      </label>
    );
  }
  function setBlock(id: TemplateBlock['id'], patch: Partial<TemplateBlock>) {
    setSettings({ ...s, email: { ...s.email, blocks: s.email.blocks.map(b => (b.id === id ? { ...b, ...patch } : b)) } });
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-6">
      <GfoPageHeader eyebrow="Scheduling · settings" title="Trip settings" description="Defaults every trip reads. A trip can move its own cutoffs with a reason; the words below are what every passenger email says unless scheduling edits a draft."
        actions={canEdit && <Button variant="outline" size="sm" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset to defaults</Button>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GfoPanel title="Cutoffs before first departure">
          <div className="space-y-2">
            {num('Names for every seat — domestic', s.cutoffs.namesDomesticHours, n => setSettings({ ...s, cutoffs: { ...s.cutoffs, namesDomesticHours: n } }), 'hours')}
            {num('Names for every seat — international', s.cutoffs.namesInternationalHours, n => setSettings({ ...s, cutoffs: { ...s.cutoffs, namesInternationalHours: n } }), 'hours')}
            {num('Passenger forms', s.cutoffs.formsDays, n => setSettings({ ...s, cutoffs: { ...s.cutoffs, formsDays: n } }), 'days')}
            {num('Catering', s.cutoffs.cateringHours, n => setSettings({ ...s, cutoffs: { ...s.cutoffs, cateringHours: n } }), 'hours')}
            {num('Trip sheet freezes · email drafted', s.cutoffs.freezeHours, n => setSettings({ ...s, cutoffs: { ...s.cutoffs, freezeHours: n } }), 'hours')}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Measured from the first departure; shown in Eastern time on every trip.</p>
        </GfoPanel>

        <GfoPanel title="The aircraft always kept for the principal">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.principalReserve.enabled} disabled={!canEdit} onChange={e => setSettings({ ...s, principalReserve: { ...s.principalReserve, enabled: e.target.checked } })} aria-label="Reserve on" />Keep one aircraft home whenever the principal has no trip</label>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm"><span className="gfo-eyebrow mb-1 block text-muted-foreground">Principal</span>
              {/* The principal is a FLAG ON THE RECORD, not a name in settings — a name here stopped
                  matching the moment anyone was renamed, and the reserve then quietly released the
                  aircraft (Phase 5 slice 2). */}
              <select className={`${field} w-full`} value={principalOf(people)?.id ?? ''} disabled={!canEdit} aria-label="Principal" onChange={e => setPeople(ps => setPrincipal(ps, e.target.value))}>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <label className="text-sm"><span className="gfo-eyebrow mb-1 block text-muted-foreground">Cabin to keep</span>
              <select className={`${field} w-full`} value={s.principalReserve.cabin} disabled={!canEdit} aria-label="Cabin" onChange={e => setSettings({ ...s, principalReserve: { ...s.principalReserve, cabin: e.target.value as 'big' | 'standard' | 'any' } })}>
                <option value="big">big cabin (G650ER)</option><option value="standard">standard cabin (G500)</option><option value="any">any</option>
              </select></label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Days the principal is on a trip of their own free all four. Scheduling can release the reserve for a day from the board, with a reason.</p>
        </GfoPanel>

        <GfoPanel title="Dead-man switch">
          {num('Auto-send the passenger email if nobody has, after', s.email.deadManHours, n => setSettings({ ...s, email: { ...s.email, deadManHours: n } }), 'hours')}
          <p className="mt-3 text-xs text-muted-foreground">Open question (Q27): the interval, whether it applies to international trips, and who is told an email went out unreviewed. The record always says so.</p>
        </GfoPanel>

        <GfoPanel title="Passenger email" className="lg:col-span-2">
          <label className="block text-sm"><span className="gfo-eyebrow mb-1 block text-muted-foreground">Subject</span>
            <input className={`${field} w-full`} value={s.email.subject} disabled={!canEdit} onChange={e => setSettings({ ...s, email: { ...s.email, subject: e.target.value } })} aria-label="Subject" />
            <span className="text-xs text-muted-foreground">{'{{destination}}'} and {'{{date}}'} fill in from the trip.</span>
          </label>
          <ul className="mt-4 divide-y divide-border">
            {s.email.blocks.map(b => {
              const auto = b.id === 'when' || b.id === 'weather' || b.id === 'crew' || b.id === 'catering';
              return (
                <li key={b.id} className="grid gap-2 py-3 md:grid-cols-[200px_1fr]">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={b.enabled} disabled={!canEdit} onChange={e => setBlock(b.id, { enabled: e.target.checked })} aria-label={`Include ${b.title}`} />
                    <span><input className="h-7 w-full rounded border border-border bg-input-background px-2 text-sm font-medium" value={b.title} disabled={!canEdit} onChange={e => setBlock(b.id, { title: e.target.value })} aria-label={`${b.id} title`} />
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{auto ? 'written from the trip' : 'your words'}</span></span>
                  </label>
                  {auto ? (
                    <p className="text-xs text-muted-foreground">
                      {b.id === 'when' && 'Where to be, when, and where you land — from the frozen sheet.'}
                      {b.id === 'weather' && 'Forecast at each destination. Demo data today; the NWS pull is Phase 2 and the wording is with the DOM (Q14).'}
                      {b.id === 'crew' && 'Names and the blurbs below.'}
                      {b.id === 'catering' && 'Whatever is loaded on each leg. Left out when nothing is.'}
                    </p>
                  ) : (
                    <div>
                      <textarea className="w-full rounded-md border border-border bg-input-background p-2 text-sm" rows={3} value={b.body} disabled={!canEdit} onChange={e => setBlock(b.id, { body: e.target.value })} aria-label={`${b.title} text`} />
                      {b.id === 'safety' && <input className={`${field} mt-1 w-full`} placeholder="Safety video link (optional)" value={b.link ?? ''} disabled={!canEdit} onChange={e => setBlock(b.id, { link: e.target.value })} aria-label="Safety video link" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </GfoPanel>

        <GfoPanel title="Crew blurbs">
          <ul className="space-y-2">
            {Object.entries(s.blurbs).map(([name, text]) => (
              <li key={name} className="text-sm"><span className="font-medium">{name}</span>
                <input className={`${field} mt-1 w-full`} value={text} disabled={!canEdit} onChange={e => setSettings({ ...s, blurbs: { ...s.blurbs, [name]: e.target.value } })} aria-label={`Blurb for ${name}`} /></li>
            ))}
          </ul>
        </GfoPanel>

        <GfoPanel title="Who gets the email">
          <ul className="space-y-2">
            {people.map(p => (
              <li key={p.id} className="flex items-center justify-between text-sm"><span>{p.name}<span className="ml-2 text-xs text-muted-foreground">{p.hasFlown ? 'has flown' : 'first trip ahead'}</span></span>
                <select className={`${field} h-8`} value={p.briefingPref} disabled={!canEdit} aria-label={`${p.name} preference`} onChange={e => setPeople(ps => upsertPerson(ps, { ...p, briefingPref: e.target.value as BriefingPrefValue }))}>
                  <option value="every">every trip</option><option value="first">first trip only</option><option value="never">never</option>
                </select></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Someone not on this list gets the email — missing a first-timer is the worse failure. Edited here or on the person's own record; there is one copy.</p>
        </GfoPanel>
      </div>
    </div>
  );
}
