import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check, ArrowDownRight } from 'lucide-react';
import { Button } from '../ui/button';
import { getFormTemplates, saveFormTemplate } from './formTemplates';
import { APPROVER_ROLES } from './approvalRequests';
import type { FieldType, FormField, FormTemplate } from './types';

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'multiselect', 'number', 'date'];
const OPTION_TYPES: FieldType[] = ['select', 'radio', 'multiselect'];

export function FormManager() {
  // Draft-and-save: edits stay local until "Save changes" writes the template
  // back to the persisted store the crew Report dialog renders from.
  const [templates, setTemplates] = useState<FormTemplate[]>(() => getFormTemplates().map((t) => ({ ...t, fields: t.fields.map((f) => ({ ...f })) })));
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? '');
  // Dirty is tracked PER template — a shared flag would let "Save changes" on
  // template B silently strand template A's unsaved draft.
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [savedFlash, setSavedFlash] = useState(false);

  const selected = templates.find((t) => t.id === selectedId)!;
  const dirty = dirtyIds.has(selectedId);

  function mutate(fn: (t: FormTemplate) => FormTemplate) {
    setTemplates((prev) => prev.map((t) => (t.id === selectedId ? fn(t) : t)));
    setDirtyIds((prev) => new Set(prev).add(selectedId));
  }
  function updateField(id: string, patch: Partial<FormField>) {
    mutate((t) => ({
      ...t,
      fields: t.fields.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        // Switching into an option-based type needs something to choose from.
        if (patch.type && OPTION_TYPES.includes(patch.type) && !next.options?.length) {
          next.options = ['Option 1', 'Option 2'];
        }
        return next;
      }),
    }));
  }
  function move(id: string, dir: -1 | 1) {
    mutate((t) => {
      const i = t.fields.findIndex((f) => f.id === id);
      const j = i + dir;
      if (j < 0 || j >= t.fields.length) return t;
      const fields = t.fields.slice();
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...t, fields };
    });
  }
  function remove(id: string) { mutate((t) => ({ ...t, fields: t.fields.filter((f) => f.id !== id) })); }
  function addField() {
    mutate((t) => ({ ...t, fields: [...t.fields, { id: `f${Date.now()}`, label: 'New field', type: 'text', required: false }] }));
  }

  // ── approval routing (D39) ──
  // Only storeless forms (waiver) use the generic chain engine. Forms that
  // already have their own destination — hazard's workflow, ASAP's confidential
  // review, the recognitions wall, trip-side FRAT/GRAT — would get a SECOND,
  // disconnected record if routed here, so the chain editor is replaced by a
  // note pointing at where that form actually goes.
  const chain = selected.approvalChain ?? [];
  const OWN_FLOW_NOTE: Partial<Record<FormTemplate['kind'], string>> = {
    Hazard: 'Hazard approvals run through the hazard workflow (Manager → Accountable Executive review), not this chain.',
    ASAP: 'ASAP reports route through the confidential ASAP review queue (Reviews → ASAP), not this chain.',
    CWS: 'Recognitions post to the Recognitions wall and need no approval step.',
    FRAT: 'Flight Risk Assessments are reviewed on the trip (Reviews → FRAT), not through this chain.',
    GRAT: 'Ground Risk Assessments are reviewed on the trip (Reviews → GRAT), not through this chain.',
    Audit: 'Audits are managed in the Audits console, not through this chain.',
  };
  const ownFlowNote = OWN_FLOW_NOTE[selected.kind];
  const isRoutable = !ownFlowNote;
  function setChain(next: string[]) { mutate((t) => ({ ...t, approvalChain: next })); }
  function addApprover() {
    // Default to a role not already in the chain, else the first role.
    const unused = APPROVER_ROLES.find((r) => !chain.includes(r.value)) ?? APPROVER_ROLES[0];
    setChain([...chain, unused.value]);
  }
  function setApprover(i: number, role: string) { setChain(chain.map((r, j) => (j === i ? role : r))); }
  function removeApprover(i: number) { setChain(chain.filter((_, j) => j !== i)); }
  function moveApprover(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= chain.length) return;
    const next = chain.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setChain(next);
  }
  function save() {
    // The store sanitizes (a choice field never persists with zero options);
    // mirror the cleaned version back into the draft so the editor shows
    // exactly what was saved.
    const clean = saveFormTemplate(selected);
    setTemplates((prev) => prev.map((t) => (t.id === clean.id ? clean : t)));
    setDirtyIds((prev) => { const n = new Set(prev); n.delete(selectedId); return n; });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
      {/* template list */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 px-0.5">Form templates</div>
        {templates.map((t) => (
          <button key={t.id} onClick={() => setSelectedId(t.id)}
            className={`text-left rounded-lg px-3 py-2.5 border transition-colors ${t.id === selectedId ? 'bg-accent/10 border-accent' : 'bg-card border-border hover:border-muted-foreground/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[14px] font-medium ${t.id === selectedId ? 'text-accent' : 'text-foreground'}`}>{t.name}</span>
              {dirtyIds.has(t.id) && <span className="text-[9px] font-bold uppercase tracking-wide text-[color:var(--gfo-warning)] ml-auto">unsaved</span>}
              {t.scored && !dirtyIds.has(t.id) && <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5 ml-auto">scored</span>}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{t.fields.length} fields</div>
          </button>
        ))}
      </div>

      {/* editor */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-[16px] font-semibold">{selected.name}</h3>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">{selected.description}</p>
          </div>
          <Button size="sm" onClick={save} disabled={!dirty} className="gap-1.5 shrink-0">
            {savedFlash ? <><Check className="w-4 h-4" /> Saved</> : 'Save changes'}
          </Button>
        </div>

        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-2">Fields</div>
        <div className="flex flex-col gap-2">
          {selected.fields.map((f, idx) => (
            <div key={f.id} className="bg-muted/40 border border-border rounded-md px-2.5 py-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                <input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-foreground border-b border-transparent focus:border-accent" />
                <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                  className="text-[12px] bg-card border border-border rounded-md px-2 py-1 text-muted-foreground shrink-0">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => updateField(f.id, { required: !f.required })}
                  className={`text-[11px] font-semibold rounded-md px-2 py-1 border shrink-0 transition-colors ${f.required ? 'bg-accent/10 text-accent border-accent' : 'bg-card text-muted-foreground border-border'}`}>
                  {f.required ? 'Required' : 'Optional'}
                </button>
                <div className="flex shrink-0">
                  <button onClick={() => move(f.id, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(f.id, 1)} disabled={idx === selected.fields.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(f.id)} className="p-1 text-muted-foreground hover:text-[color:var(--gfo-error)]"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {OPTION_TYPES.includes(f.type) && (
                <div className="flex items-center gap-2 mt-1.5 pl-6">
                  <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">Options</span>
                  <input
                    value={(f.options || []).join(', ')}
                    onChange={(e) => updateField(f.id, { options: e.target.value.split(',').map((s) => s.trimStart()) })}
                    onBlur={(e) => updateField(f.id, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Comma-separated choices"
                    className="flex-1 min-w-0 bg-card border border-border rounded-md px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-accent" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addField} className="mt-3 flex items-center gap-2 text-[13px] font-medium text-accent hover:underline">
          <Plus className="w-4 h-4" /> Add field
        </button>

        {/* Approval routing (D39): who a filed form goes to, in order. */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Approval routing</div>
          {!isRoutable ? (
            <div className="text-[12.5px] text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2.5">
              {ownFlowNote}
            </div>
          ) : chain.length === 0 ? (
            <>
              <div className="text-[12.5px] text-muted-foreground mb-2.5">No approval step — a filed {selected.name.toLowerCase()} is recorded and the safety team is notified, with no sign-off gate.</div>
              <button onClick={addApprover} className="flex items-center gap-2 text-[13px] font-medium text-accent hover:underline">
                <Plus className="w-4 h-4" /> Add an approver
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {chain.map((role, i) => (
                  <div key={i}>
                    {i > 0 && <div className="flex items-center gap-1 text-muted-foreground/60 pl-2.5 py-0.5"><ArrowDownRight className="w-3.5 h-3.5" /></div>}
                    <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-md px-2.5 py-2">
                      <span className="w-[22px] h-[22px] rounded-full bg-accent/15 text-accent text-[12px] font-semibold grid place-items-center shrink-0">{i + 1}</span>
                      <select value={role} onChange={(e) => setApprover(i, e.target.value)}
                        className="flex-1 min-w-0 text-[13.5px] bg-card border border-border rounded-md px-2 py-1.5 text-foreground">
                        {APPROVER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <span className="text-[11px] text-muted-foreground shrink-0">{i === chain.length - 1 ? 'final' : `then step ${i + 2}`}</span>
                      <div className="flex shrink-0">
                        <button onClick={() => moveApprover(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveApprover(i, 1)} disabled={i === chain.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeApprover(i)} className="p-1 text-muted-foreground hover:text-[color:var(--gfo-error)]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addApprover} className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-accent hover:underline">
                <Plus className="w-4 h-4" /> Add approver
              </button>
            </>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-border text-[11.5px] text-muted-foreground">
          Saving updates the live form — crew see these fields the next time they open <b className="text-foreground font-medium">Report</b>. Answers to fields you add are kept on the record even though the archive has no dedicated column for them.{isRoutable && chain.length > 0 && ' Filed forms route to each approver above, in order, in their own Approvals inbox.'} {selected.scored && 'Scoring rules for this risk form are configured in the FRAT/GRAT builders, not here.'}
        </div>
      </div>
    </div>
  );
}
