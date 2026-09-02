// The passenger email (D106): a demo preview per recipient, editable blocks, a send list, and the
// dead-man countdown. Sending records the event on the trip; no mail leaves the demo.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, TimerReset } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { autoSendIfDue, editDraftBlock, emailDraftOf, emailState, sendEmail, setDraftRecipients } from '../engine/briefingEmail';
import { latestSheet } from '../engine/tripSheet';
import { formatEt } from '../engine/cutoffs';

export default function EmailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, actor, update, nowUtc, settings, setSettings } = useTripsModule();
  const trip = trips.find(t => t.id === id);
  const draft = trip ? emailDraftOf(trip) : null;
  const sheet = trip ? latestSheet(trip) : null;
  const [to, setTo] = useState<string | null>(null);

  if (!trip) return <div className="p-6"><GfoPanel><p className="text-sm text-muted-foreground">Not visible to you.</p></GfoPanel></div>;
  if (!draft || !sheet) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4 p-6">
        <GfoPageHeader eyebrow="Passenger email" title={trip.title} />
        <GfoPanel><p className="text-sm text-muted-foreground">Drafted when the trip sheet freezes at T-72. Nothing yet.</p></GfoPanel>
      </div>
    );
  }

  const isSched = actor.role === 'scheduling';
  const state = emailState(trip, nowUtc());
  const editable = isSched && state.state === 'drafted';
  const everyone = Array.from(new Set(sheet.legs.flatMap(l => l.aboard)));
  const current = draft.emails.find(e => e.to === to) ?? draft.emails[0];

  function toggleRecipient(name: string) {
    const next = draft!.recipients.includes(name) ? draft!.recipients.filter(r => r !== name) : [...draft!.recipients, name];
    update(trip!.id, t => setDraftRecipients(t, next));
  }
  function setPref(name: string, pref: 'every' | 'first' | 'never') {
    const prefs = settings.passengerPrefs.some(p => p.name === name)
      ? settings.passengerPrefs.map(p => (p.name === name ? { ...p, pref } : p))
      : [...settings.passengerPrefs, { name, pref, hasFlown: false }];
    setSettings({ ...settings, passengerPrefs: prefs });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow={<button onClick={() => navigate(`/trips/${trip.id}`)} className="inline-flex items-center gap-1 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Back to the trip</button> as unknown as string}
        title="Passenger email"
        description={`Drafted ${formatEt(draft.draftedAtUtc)} from trip sheet v${draft.sheetVersion} · demo preview, nothing is sent outside myGFO`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {state.state === 'drafted' && (
              <span className={cn('rounded px-2 py-1 text-xs font-medium', state.hoursLeft < 2 ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-800 dark:text-amber-400')}>
                Sends itself in {state.hoursLeft.toFixed(1)} h if nobody does
              </span>
            )}
            {state.state === 'sent' && (
              <span className={cn('rounded px-2 py-1 text-xs font-medium', state.auto ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400')}>
                {state.auto ? 'Auto-sent, unreviewed' : 'Sent'} · {formatEt(state.at)} · {draft.recipients.length} {draft.recipients.length === 1 ? 'person' : 'people'}
              </span>
            )}
            {editable && (
              <>
                <Button size="sm" onClick={() => update(trip.id, t => sendEmail(t, actor, nowUtc()))} disabled={draft.recipients.length === 0}><Send className="mr-1.5 h-4 w-4" />Send to {draft.recipients.length}</Button>
                <Button size="sm" variant="outline" title="Demo: jump the clock past the dead-man timer" onClick={() => update(trip.id, t => autoSendIfDue(t, emailDraftOf(t)!.autoSendAtUtc))}><TimerReset className="mr-1.5 h-4 w-4" />Simulate timer elapsed</Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <GfoPanel title="Who gets it">
          <ul className="space-y-2 text-sm">
            {everyone.map(name => {
              const pref = settings.passengerPrefs.find(p => p.name === name)?.pref ?? 'every';
              const on = draft.recipients.includes(name);
              return (
                <li key={name} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={on} disabled={!editable} onChange={() => toggleRecipient(name)} aria-label={`Send to ${name}`} />
                    <span className={cn(!on && 'text-muted-foreground')}>{name}</span>
                  </label>
                  <select className="h-7 rounded border border-border bg-input-background px-1 text-xs" value={pref} disabled={!isSched} aria-label={`${name} preference`} onChange={e => setPref(name, e.target.value as 'every' | 'first' | 'never')}>
                    <option value="every">every trip</option><option value="first">first trip only</option><option value="never">never</option>
                  </select>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">The preference lives on the passenger record; the tick is this trip only. Frequent flyers default to never so they are not spammed.</p>
        </GfoPanel>

        <GfoPanel
          title={current ? `Preview · to ${current.to}` : 'Preview'}
          action={draft.emails.length > 1 && (
            <div className="flex gap-1">{draft.emails.map(e => <button key={e.to} onClick={() => setTo(e.to)} className={cn('rounded px-2 py-0.5 text-xs', (current?.to === e.to) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary')}>{e.to}</button>)}</div>
          )}
        >
          {!current && <p className="text-sm text-muted-foreground">Nobody on the send list.</p>}
          {current && (
            <div className="rounded-md border border-border bg-card p-5">
              <div className="border-b border-border pb-3 text-sm">
                <div><span className="text-muted-foreground">To</span> {current.to}</div>
                <div><span className="text-muted-foreground">Subject</span> <span className="font-medium">{current.subject}</span></div>
              </div>
              <div className="mt-4 space-y-4">
                {current.blocks.map(b => (
                  <div key={b.id}>
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-semibold text-primary">{b.title}</div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.source === 'auto' ? (b.id === 'weather' ? 'auto · demo forecast' : 'auto from the trip') : 'template'}</span>
                    </div>
                    {editable ? (
                      <textarea className="mt-1 w-full rounded-md border border-border bg-input-background p-2 text-sm leading-relaxed" rows={Math.max(2, Math.ceil(b.text.length / 90))} value={b.text} aria-label={b.title}
                        onChange={e => update(trip.id, t => editDraftBlock(t, current.to, b.id, e.target.value))} />
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed">{b.text}</p>
                    )}
                    {b.link && <a className="text-xs text-accent hover:underline" href={b.link} target="_blank" rel="noreferrer">Safety video</a>}
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">Global Flight Operations · questions go to your assistant or to scheduling.</p>
            </div>
          )}
          {editable && <p className="mt-2 text-xs text-muted-foreground">Edits here are for this trip and this person. Change the words for every trip under Trip settings.</p>}
        </GfoPanel>
      </div>
    </div>
  );
}
