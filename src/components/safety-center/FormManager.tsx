import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { getFormTemplates, saveFormTemplate } from './formTemplates';
import type { FieldType, FormField, FormTemplate } from './types';

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'multiselect', 'number', 'date'];
const OPTION_TYPES: FieldType[] = ['select', 'radio', 'multiselect'];

export function FormManager() {
  // Draft-and-save: edits stay local until "Save changes" writes the template
  // back to the persisted store the crew Report dialog renders from.
  const [templates, setTemplates] = useState<FormTemplate[]>(() => getFormTemplates().map((t) => ({ ...t, fields: t.fields.map((f) => ({ ...f })) })));
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? '');
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const selected = templates.find((t) => t.id === selectedId)!;

  function mutate(fn: (t: FormTemplate) => FormTemplate) {
    setTemplates((prev) => prev.map((t) => (t.id === selectedId ? fn(t) : t)));
    setDirty(true);
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
  function save() {
    saveFormTemplate(selected);
    setDirty(false);
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
            className={`text-left rounded-[10px] px-3 py-2.5 border transition-colors ${t.id === selectedId ? 'bg-accent/10 border-accent' : 'bg-card border-border hover:border-muted-foreground/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[14px] font-medium ${t.id === selectedId ? 'text-accent' : 'text-foreground'}`}>{t.name}</span>
              {t.scored && <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5 ml-auto">scored</span>}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{t.fields.length} fields</div>
          </button>
        ))}
      </div>

      {/* editor */}
      <div className="bg-card border border-border rounded-[12px] p-5">
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
            <div key={f.id} className="bg-muted/40 border border-border rounded-[9px] px-2.5 py-2">
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

        <div className="mt-5 pt-4 border-t border-border text-[11.5px] text-muted-foreground">
          Saving updates the live form — crew see these fields the next time they open <b className="text-foreground font-medium">Report</b>. Answers to fields you add are kept on the record even though the archive has no dedicated column for them. {selected.scored && 'Scoring rules for this risk form are configured in the FRAT/GRAT builders, not here.'}
        </div>
      </div>
    </div>
  );
}
