// Trip settings — everything the users edit at the end (D106): cutoff defaults, the dead-man
// timer, the email template, crew blurbs, passenger preferences. Scheduling only.

import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { useTripsModule } from '../TripsContext';
import { DEFAULT_SETTINGS } from '../data/settingsStore';
import type { TemplateBlock } from '../engine/briefingEmail';

const field = 'h-9 rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

export default function TripSettingsPage() {
  const { settings, setSettings, actor } = useTripsModule();
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
            {s.passengerPrefs.map(p => (
              <li key={p.name} className="flex items-center justify-between text-sm"><span>{p.name}<span className="ml-2 text-xs text-muted-foreground">{p.hasFlown ? 'has flown' : 'first trip ahead'}</span></span>
                <select className={`${field} h-8`} value={p.pref} disabled={!canEdit} aria-label={`${p.name} preference`} onChange={e => setSettings({ ...s, passengerPrefs: s.passengerPrefs.map(x => (x.name === p.name ? { ...x, pref: e.target.value as 'every' | 'first' | 'never' } : x)) })}>
                  <option value="every">every trip</option><option value="first">first trip only</option><option value="never">never</option>
                </select></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Someone not on this list gets the email — missing a first-timer is the worse failure.</p>
        </GfoPanel>
      </div>
    </div>
  );
}
