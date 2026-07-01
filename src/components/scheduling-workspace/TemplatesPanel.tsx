import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { FileText, Pencil, Lock } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { parseTemplate } from '../../scheduling/store';
import type { ChecklistTemplate, TaskDefinition, DueRule } from '../../scheduling/engine';

interface TemplatesPanelProps {
  userRole: string;
  additionalRoles?: string[];
}

// TODO(dev): the real gate is a `checklist-admin` / `scheduling-lead` capability that does not
// exist yet in the role model. 'admin'/'lead' are used here as the closest stand-in per Plan 3.
function canEditTemplates(userRole: string, additionalRoles?: string[]): boolean {
  return (
    userRole === 'admin' || userRole === 'lead'
    || !!additionalRoles?.includes('admin') || !!additionalRoles?.includes('lead')
  );
}

function summarizeDueRule(rule: DueRule): string {
  switch (rule.kind) {
    case 'dayOfTimeLocal': return `Daily at ${rule.time} local`;
    case 'weekday': return `${rule.day}${rule.period ? ` ${rule.period}` : ''}`;
    case 'dayOfMonth': return `${rule.when} day ${rule.day} of month`;
    case 'quarterWeek': return `Quarter week ${rule.week}`;
    case 'annualDate': return `Annually on ${rule.month}/${rule.day}`;
    case 'hoursBeforeEtd': return `${rule.hours}h before ETD`;
    case 'businessDaysBeforeEtd': return `${rule.days} business day(s) before ETD`;
    case 'monthsBeforeEtd': return `${rule.months} month(s) before ETD`;
    default: return JSON.stringify(rule);
  }
}

function summarizeCondition(def: TaskDefinition): string | null {
  if (!def.condition || def.condition.kind === 'always') return null;
  try {
    return JSON.stringify(def.condition);
  } catch {
    return null;
  }
}

export default function TemplatesPanel({ userRole, additionalRoles }: TemplatesPanelProps) {
  const { store, tick, bump } = useSchedulingWorkspace();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [editing, setEditing] = useState<{ template: ChecklistTemplate; taskDefId: string } | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftRequiresAck, setDraftRequiresAck] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = canEditTemplates(userRole, additionalRoles);

  useEffect(() => {
    let cancelled = false;
    store.listPublishedTemplates().then((rows) => { if (!cancelled) setTemplates(rows); });
    return () => { cancelled = true; };
  }, [store, tick]);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, ChecklistTemplate[]>();
    for (const t of templates) {
      const key = `${t.triggerType} / ${t.scope}`;
      const list = byGroup.get(key) ?? [];
      list.push(t);
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [templates]);

  function openEdit(template: ChecklistTemplate, taskDef: TaskDefinition) {
    setEditing({ template, taskDefId: taskDef.id });
    setDraftTitle(taskDef.title);
    setDraftRequiresAck(taskDef.requiresAck);
    setSaveError(null);
  }

  async function handlePublish() {
    if (!editing) return;
    setSaveError(null);
    setSaving(true);
    try {
      const { template, taskDefId } = editing;
      const nextTaskDefinitions = template.taskDefinitions.map((d) => (
        d.id === taskDefId ? { ...d, title: draftTitle, requiresAck: draftRequiresAck } : d
      ));
      const nextTemplate = parseTemplate({
        ...template,
        version: template.version + 1,
        taskDefinitions: nextTaskDefinitions,
      });
      await store.saveTemplate(nextTemplate);
      bump();
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish new version');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>
          Published checklists as editable, versioned data.
          {!canEdit && ' Read-only for your role — templates are editable by scheduling-lead/admin.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {grouped.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No templates published yet.</p>
          </div>
        ) : (
          grouped.map(([groupKey, groupTemplates]) => (
            <div key={groupKey} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{groupKey}</h3>
              {groupTemplates.map((template) => (
                <div key={template.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-medium text-foreground">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.id} · v{template.version} · {template.status}
                      </div>
                    </div>
                    {!canEdit && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Read-only
                      </Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {template.taskDefinitions.slice().sort((a, b) => a.order - b.order).map((def) => (
                      <div key={def.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground">{def.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {def.ownerRole} · {def.category} · {summarizeDueRule(def.dueRule)}
                            {def.requiresAck && ' · requires ack'}
                            {def.handoffTarget && ` · hands off to ${def.handoffTarget.value}`}
                            {summarizeCondition(def) && ` · condition: ${summarizeCondition(def)}`}
                          </div>
                        </div>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(template, def)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task (draft new version)</DialogTitle>
            <DialogDescription>
              Minimal editor for this slice: title + ack requirement only. Publishing saves
              template version {editing ? editing.template.version + 1 : ''} via the same
              validation (parseTemplate) the seed data goes through. A full no-code rule/condition
              builder is a documented follow-up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="draftTitle">Task title</Label>
              <Input id="draftTitle" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="draftRequiresAck"
                type="checkbox"
                checked={draftRequiresAck}
                onChange={(e) => setDraftRequiresAck(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="draftRequiresAck">Requires acknowledgement</Label>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={saving || !draftTitle.trim()}>
              {saving ? 'Publishing...' : 'Publish new version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
