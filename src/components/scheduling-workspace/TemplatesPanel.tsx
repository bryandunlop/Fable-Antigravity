import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Pencil, Lock } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import type { ChecklistTemplate, TaskDefinition, DueRule } from '../../scheduling/engine';

interface TemplatesPanelProps {
  userRole: string;
  additionalRoles?: string[];
}

// TODO(dev): the real gate is a `checklist-admin` capability that does not exist yet in the role
// model. admin/lead plus the scheduling leadership roles are the closest stand-in per Plan 3 —
// executors (plain 'scheduling') stay read-only by design.
const TEMPLATE_EDIT_ROLES = ['admin', 'lead', 'scheduling-manager', 'lead-scheduler'];
function canEditTemplates(userRole: string, additionalRoles?: string[]): boolean {
  return TEMPLATE_EDIT_ROLES.includes(userRole)
    || !!additionalRoles?.some(r => TEMPLATE_EDIT_ROLES.includes(r));
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
  const { store, tick } = useSchedulingWorkspace();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);

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
                    {canEdit ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(template)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit checklist
                      </Button>
                    ) : (
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>

      {editing && (
        <TemplateEditorDialog
          template={editing}
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
        />
      )}
    </Card>
  );
}
