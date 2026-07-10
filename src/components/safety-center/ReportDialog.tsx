import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TriangleAlert, Plane, ThumbsUp, FileCheck, Check } from 'lucide-react';

export type Kind = 'hazard' | 'asap' | 'cws' | 'waiver';

const TYPES: Record<Kind, { name: string; desc: string; icon: typeof TriangleAlert; bg: string }> = {
  hazard: { name: 'A hazard or unsafe condition', desc: 'Something that could cause harm — FOD, a broken fixture, a risky procedure.', icon: TriangleAlert, bg: 'color-mix(in srgb, var(--gfo-warning) 22%, transparent)' },
  asap: { name: 'A flight safety event (ASAP)', desc: 'Confidential. An in-flight event — an altitude or approach deviation, a TCAS RA.', icon: Plane, bg: 'color-mix(in srgb, var(--gfo-error) 12%, transparent)' },
  cws: { name: 'Someone working safely (CWS)', desc: 'A positive observation worth recognizing.', icon: ThumbsUp, bg: 'color-mix(in srgb, var(--gfo-sunrise) 22%, transparent)' },
  waiver: { name: 'A waiver request', desc: 'Ask for an exception — a duty-time extension, a procedure deviation.', icon: FileCheck, bg: 'color-mix(in srgb, var(--accent) 12%, transparent)' },
};

export function ReportDialog({
  open, onOpenChange, onFiled, initialKind = null,
}: { open: boolean; onOpenChange: (v: boolean) => void; onFiled?: (kind: Kind, values: Record<string, string>) => void; initialKind?: Kind | null }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  // Opening from the Forms catalog jumps straight to a specific form's details.
  useEffect(() => {
    if (open) {
      setKind(initialKind);
      setStep(initialKind ? 1 : 0);
      setValues({});
    }
  }, [open, initialKind]);

  function reset() { setStep(0); setKind(null); setValues({}); }
  function close() { onOpenChange(false); setTimeout(reset, 200); }

  const t = kind ? TYPES[kind] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{step === 2 ? 'Report filed' : t ? t.name : 'Report a safety issue'}</DialogTitle>
            <span className="text-xs text-muted-foreground font-semibold">{step === 2 ? 'Done' : `Step ${step + 1} of 3`}</span>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <div className="flex flex-col gap-2.5">
              {(Object.keys(TYPES) as Kind[]).map((k) => {
                const Icon = TYPES[k].icon;
                return (
                  <button key={k} onClick={() => { setKind(k); setStep(1); }}
                    className="text-left border border-border rounded-[10px] p-3.5 flex gap-3 items-start hover:border-accent hover:bg-accent/5 transition-colors">
                    <div className="w-[34px] h-[34px] rounded-[9px] grid place-items-center shrink-0" style={{ background: TYPES[k].bg }}>
                      <Icon className="w-[17px] h-[17px] text-foreground" />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold">{TYPES[k].name}</div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">{TYPES[k].desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && kind === 'hazard' && (
            <div className="flex flex-col gap-3.5">
              <Field label="Where"><Input placeholder="e.g. KTEB · stand 3" value={values.where || ''} onChange={(e) => set('where', e.target.value)} /></Field>
              <Field label="Aircraft (optional)"><Input placeholder="e.g. N2PG" value={values.aircraft || ''} onChange={(e) => set('aircraft', e.target.value)} /></Field>
              <Field label="What you saw"><Textarea rows={3} placeholder="Describe it…" value={values.what || ''} onChange={(e) => set('what', e.target.value)} /></Field>
              <Field label="How risky?">
                <Select value={values.risk || 'med'} onValueChange={(v: string) => set('risk', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — minor</SelectItem>
                    <SelectItem value="med">Medium — we'll confirm</SelectItem>
                    <SelectItem value="high">High — needs attention now</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          {step === 1 && kind === 'asap' && (
            <div className="flex flex-col gap-3.5">
              <Field label="Phase of flight">
                <Select defaultValue="approach">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Taxi', 'Takeoff', 'Climb', 'Cruise', 'Approach', 'Landing'].map((p) => (
                      <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Airport / area"><Input placeholder="e.g. KTEB" /></Field>
              <Field label="What happened"><Textarea rows={3} placeholder="Describe it…" /></Field>
              <div className="rounded-[9px] px-3 py-2.5 text-[12.5px] leading-snug sc-accent">🔒 Confidential — your name is separated from the event before review.</div>
            </div>
          )}
          {step === 1 && kind === 'cws' && (
            <div className="flex flex-col gap-3.5">
              <Field label="Who"><Input placeholder="Name" /></Field>
              <Field label="For what"><Textarea rows={3} placeholder="What did they do…" /></Field>
            </div>
          )}
          {step === 1 && kind === 'waiver' && (
            <div className="flex flex-col gap-3.5">
              <Field label="What are you requesting?"><Textarea rows={2} placeholder="e.g. +1:30 duty-time extension" /></Field>
              <Field label="Reason / justification"><Textarea rows={3} placeholder="Why is it needed…" /></Field>
              <Field label="Trip / date (optional)"><Input placeholder="e.g. KTEB-KASE, tomorrow" /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="text-center pt-3 pb-1">
              <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3.5 sc-green"><Check className="w-7 h-7" /></div>
              <h4 className="text-[17px] font-semibold mb-1.5">Report filed</h4>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
                Routed to the safety team. Track it under <b className="text-foreground font-medium">Waiting</b> — you'll be notified when it's triaged and when it's closed. No need to chase anyone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border flex-row justify-between sm:justify-between">
          {step === 0 && <Button variant="outline" onClick={close}>Cancel</Button>}
          {step === 1 && <>
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => { setStep(2); if (kind) onFiled?.(kind, values); }}>Submit report</Button>
          </>}
          {step === 2 && <><span /><Button onClick={close}>Done</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
