import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { AircraftType, ChecklistItemDef, ChecklistItemKind, ChecklistPhase, ChecklistSectionDef, ChecklistTemplate } from '../../types';
import { nextVersionFor, publishTemplate, cloneTemplateForType } from '../../engine/checklist';
import { newId } from '../../util/id';
import { useCurrentUser, useTechLog } from '../../TechLogContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Checkbox } from '../../../ui/checkbox';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const KINDS: ChecklistItemKind[] = ['CHECK', 'MEASUREMENT', 'NOTE'];

export function ChecklistTemplateEditor({
  open, onOpenChange, aircraftType, phase, existing, cloneCandidates, onPublished,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  aircraftType: AircraftType;
  phase: ChecklistPhase;
  existing?: ChecklistTemplate;
  cloneCandidates: ChecklistTemplate[];
  onPublished: (t: ChecklistTemplate) => void;
}) {
  const { state } = useTechLog();
  const user = useCurrentUser();
  const blank = (): ChecklistTemplate => ({
    id: existing?.id ?? newId('cl'), aircraftType, phase, version: 1, status: 'DRAFT',
    sections: [], createdByOid: user.oid, createdAtUtc: new Date().toISOString(),
  });
  const [draft, setDraft] = useState<ChecklistTemplate>(existing ?? blank());
  const [cloneFrom, setCloneFrom] = useState('');

  const reset = (t: ChecklistTemplate) => setDraft(t);

  const applyClone = (sourceId: string) => {
    const source = cloneCandidates.find(t => t.id === sourceId);
    if (!source) return;
    reset(cloneTemplateForType({ source, newTemplateId: newId('cl'), newAircraftType: aircraftType, newIdPrefix: newId('itm'), createdByOid: user.oid, nowUtc: new Date().toISOString() }));
    setCloneFrom(sourceId);
  };

  const addSection = () => setDraft(d => ({ ...d, sections: [...d.sections, { id: newId('sec'), title: 'NEW SECTION', items: [] }] }));
  const editSection = (idx: number, patch: Partial<ChecklistSectionDef>) => setDraft(d => ({ ...d, sections: d.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));
  const removeSection = (idx: number) => setDraft(d => ({ ...d, sections: d.sections.filter((_, i) => i !== idx) }));
  const moveSection = (idx: number, dir: -1 | 1) => setDraft(d => ({ ...d, sections: move(d.sections, idx, idx + dir) }));

  const addItem = (secIdx: number) => editSection(secIdx, {
    items: [...draft.sections[secIdx].items, { id: newId('itm'), kind: 'CHECK', label: 'New item', requiredToRelease: true }],
  });
  const editItem = (secIdx: number, itemIdx: number, patch: Partial<ChecklistItemDef>) => editSection(secIdx, {
    items: draft.sections[secIdx].items.map((it, i) => (i === itemIdx ? { ...it, ...patch } : it)),
  });
  const removeItem = (secIdx: number, itemIdx: number) => editSection(secIdx, {
    items: draft.sections[secIdx].items.filter((_, i) => i !== itemIdx),
  });
  const moveItem = (secIdx: number, itemIdx: number, dir: -1 | 1) => editSection(secIdx, {
    items: move(draft.sections[secIdx].items, itemIdx, itemIdx + dir),
  });

  const addField = (secIdx: number, itemIdx: number) => editItem(secIdx, itemIdx, {
    fields: [...(draft.sections[secIdx].items[itemIdx].fields ?? []), { id: newId('fld'), label: 'Field', unit: '' }],
  });
  const editField = (secIdx: number, itemIdx: number, fieldIdx: number, patch: Partial<{ label: string; unit: string; target: string }>) => {
    const fields = (draft.sections[secIdx].items[itemIdx].fields ?? []).map((f, i) => (i === fieldIdx ? { ...f, ...patch } : f));
    editItem(secIdx, itemIdx, { fields });
  };
  const removeField = (secIdx: number, itemIdx: number, fieldIdx: number) => {
    const fields = (draft.sections[secIdx].items[itemIdx].fields ?? []).filter((_, i) => i !== fieldIdx);
    editItem(secIdx, itemIdx, { fields });
  };

  const publish = () => {
    if (!draft.sections.length) return toast.error('Add at least one section before publishing.');
    const version = existing ? nextVersionFor(state.checklistTemplates, draft.id) : draft.version;
    const published = publishTemplate({ ...draft, version }, new Date().toISOString());
    onPublished(published);
    onOpenChange(false);
    toast.success(`Published ${aircraftType} ${phase.toLowerCase()} checklist v${published.version}`);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(existing ?? blank()); onOpenChange(o); }}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${aircraftType} ${phase.toLowerCase()} checklist` : `New ${aircraftType} ${phase.toLowerCase()} checklist`}</DialogTitle>
          <DialogDescription>Publishing creates a new version — the prior published version stays available to already-signed instances.</DialogDescription>
        </DialogHeader>

        {!existing && (
          <div className="flex items-center gap-2">
            <Label className="shrink-0">Clone from</Label>
            <Select value={cloneFrom} onValueChange={applyClone}>
              <SelectTrigger><SelectValue placeholder="Start blank, or clone an existing template" /></SelectTrigger>
              <SelectContent>
                {cloneCandidates.map(t => <SelectItem key={t.id} value={t.id}>{t.aircraftType} {t.phase.toLowerCase()} v{t.version}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4">
          {draft.sections.map((section, secIdx) => (
            <div key={section.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input value={section.title} onChange={e => editSection(secIdx, { title: e.target.value })} className="font-medium uppercase" />
                <Button size="icon" variant="ghost" onClick={() => moveSection(secIdx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => moveSection(secIdx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeSection(secIdx)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <div key={item.id} className="rounded-md border p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={item.label} onChange={e => editItem(secIdx, itemIdx, { label: e.target.value })} className="min-w-[160px] flex-1" />
                      <Select value={item.kind} onValueChange={(v: ChecklistItemKind) => editItem(secIdx, itemIdx, { kind: v, fields: v === 'MEASUREMENT' ? (item.fields ?? []) : undefined })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={item.requiredToRelease} onCheckedChange={c => editItem(secIdx, itemIdx, { requiredToRelease: !!c })} /> required</label>
                      <Button size="icon" variant="ghost" onClick={() => moveItem(secIdx, itemIdx, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => moveItem(secIdx, itemIdx, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(secIdx, itemIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Input className="mt-2" placeholder="Reference / spec (optional)" value={item.reference ?? ''} onChange={e => editItem(secIdx, itemIdx, { reference: e.target.value || undefined })} />
                    {item.kind === 'MEASUREMENT' && (
                      <div className="mt-2 space-y-1.5 pl-3">
                        {(item.fields ?? []).map((f, fieldIdx) => (
                          <div key={f.id} className="flex items-center gap-2">
                            <Input className="w-32" placeholder="Label" value={f.label} onChange={e => editField(secIdx, itemIdx, fieldIdx, { label: e.target.value })} />
                            <Input className="w-20" placeholder="Unit" value={f.unit} onChange={e => editField(secIdx, itemIdx, fieldIdx, { unit: e.target.value })} />
                            <Input className="w-28" placeholder="Target (optional)" value={f.target ?? ''} onChange={e => editField(secIdx, itemIdx, fieldIdx, { target: e.target.value || undefined })} />
                            <Button size="icon" variant="ghost" onClick={() => removeField(secIdx, itemIdx, fieldIdx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={() => addField(secIdx, itemIdx)}><Plus className="mr-1 h-3.5 w-3.5" /> Add field</Button>
                      </div>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => addItem(secIdx)}><Plus className="mr-1 h-3.5 w-3.5" /> Add item</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addSection}><Plus className="mr-1.5 h-4 w-4" /> Add section</Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={publish}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
