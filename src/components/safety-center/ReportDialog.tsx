import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TriangleAlert, Plane, ThumbsUp, FileCheck, Check } from 'lucide-react';
import { useFormTemplates, templateForKind, missingRequired, MULTI_SEP } from './formTemplates';
import type { FormField } from './types';

export type Kind = 'hazard' | 'asap' | 'cws' | 'waiver';

// Kind metadata is presentation (icon/blurb for the picker); the FIELDS come
// from the persisted template store, so the safety manager's Form-setup edits
// are what the crew actually fills out.
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
  const [triedSubmit, setTriedSubmit] = useState(false);
  const { templates } = useFormTemplates();
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      setKind(initialKind);
      setStep(initialKind ? 1 : 0);
      setValues({});
      setTriedSubmit(false);
    }
  }, [open, initialKind]);

  function reset() { setStep(0); setKind(null); setValues({}); setTriedSubmit(false); }
  function close() { onOpenChange(false); setTimeout(reset, 200); }

  const t = kind ? TYPES[kind] : null;
  const template = kind ? templateForKind(templates, kind) : undefined;
  const missing = kind && template ? missingRequired(template, values) : [];

  function submit() {
    if (!kind) return;
    if (missing.length) { setTriedSubmit(true); return; }
    setStep(2);
    onFiled?.(kind, values);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{step === 2 ? 'Report filed' : t ? t.name : 'Report a safety issue'}</DialogTitle>
            <span className="text-xs text-muted-foreground font-semibold">{step === 2 ? 'Done' : `Step ${step + 1} of 3`}</span>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">
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

          {step === 1 && template && (
            <div className="flex flex-col gap-3.5">
              {kind === 'asap' && (
                <div className="rounded-[9px] px-3 py-2.5 text-[12.5px] leading-snug sc-accent">🔒 Confidential — your name is separated from the event before review.</div>
              )}
              {template.fields.map((f) => (
                <TemplateField key={f.id} field={f} value={values[f.id] || ''} onChange={(v) => set(f.id, v)}
                  invalid={triedSubmit && f.required && !(values[f.id] || '').trim()} />
              ))}
              {triedSubmit && missing.length > 0 && (
                <div className="text-[12.5px] text-[color:var(--gfo-error)] font-medium">
                  Still needed: {missing.join(' · ')}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="text-center pt-3 pb-1">
              <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3.5 sc-green"><Check className="w-7 h-7" /></div>
              <h4 className="text-[17px] font-semibold mb-1.5">Report filed</h4>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
                Routed to the safety team. Track it under <b className="text-foreground font-medium">My reports</b> — you'll be notified when it's triaged and when it's closed. No need to chase anyone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border flex-row justify-between sm:justify-between">
          {step === 0 && <Button variant="outline" className="h-11 px-5 text-[14px]" onClick={close}>Cancel</Button>}
          {step === 1 && <>
            <Button variant="outline" className="h-11 px-5 text-[14px]" onClick={() => setStep(0)}>Back</Button>
            <Button className="h-11 px-5 text-[14px]" onClick={submit}>Submit report</Button>
          </>}
          {step === 2 && <><span /><Button className="h-11 px-5 text-[14px]" onClick={close}>Done</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── one field, rendered from its template definition ────────────────────────
function TemplateField({ field, value, onChange, invalid }: {
  field: FormField; value: string; onChange: (v: string) => void; invalid?: boolean;
}) {
  const label = (
    <Label className={`text-[11px] uppercase tracking-wide font-semibold mb-1.5 block ${invalid ? 'text-[color:var(--gfo-error)]' : 'text-muted-foreground'}`}>
      {field.label}{field.required && <span className="text-[color:var(--gfo-error)]"> *</span>}
    </Label>
  );

  if (field.type === 'textarea') {
    return <div>{label}<Textarea rows={3} placeholder="Describe it…" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  if (field.type === 'select') {
    return (
      <div>{label}
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === 'radio') {
    return (
      <div>{label}
        <div className="flex gap-2 flex-wrap">
          {(field.options || []).map((o) => (
            <button key={o} type="button" onClick={() => onChange(o)}
              className={`text-[13.5px] font-medium px-3.5 py-2 min-h-[40px] rounded-[9px] border transition-colors ${value === o ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === 'multiselect') {
    const chosen = value ? value.split(MULTI_SEP) : [];
    const toggle = (o: string) => {
      const next = chosen.includes(o) ? chosen.filter((x) => x !== o) : [...chosen, o];
      onChange(next.join(MULTI_SEP));
    };
    return (
      <div>{label}
        <div className="flex gap-1.5 flex-wrap">
          {(field.options || []).map((o) => {
            const on = chosen.includes(o);
            return (
              <button key={o} type="button" onClick={() => toggle(o)} aria-pressed={on}
                className={`text-[12.5px] font-medium px-3 py-1.5 min-h-[36px] rounded-full border transition-colors ${on ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/40'}`}>
                {on ? '✓ ' : ''}{o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === 'checkbox') {
    const on = value === 'true';
    return (
      <button type="button" onClick={() => onChange(on ? '' : 'true')}
        className="flex items-center gap-2.5 text-left min-h-[44px] group">
        <span className={`w-6 h-6 rounded-[7px] border-2 grid place-items-center transition-colors shrink-0 ${on ? 'bg-accent border-accent text-white' : 'border-muted-foreground/40 text-transparent group-hover:border-muted-foreground/70'}`}>
          <Check className="w-3.5 h-3.5" />
        </span>
        <span className="text-[14px] text-foreground">{field.label}</span>
      </button>
    );
  }
  // text / number / date fall through to a plain input
  return (
    <div>{label}
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        placeholder={field.type === 'date' ? '' : 'Type here…'}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
