import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { latestPublishedTemplate, canEditChecklistTemplates, interactionModeOf } from '../engine/checklist';
import type { AircraftType, ChecklistPhase, ChecklistTemplate } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { ChecklistTemplateEditor } from '../components/checklist/ChecklistTemplateEditor';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

const AIRCRAFT_TYPES: AircraftType[] = ['G650ER', 'G500', 'G800'];
const PHASES: ChecklistPhase[] = ['PREFLIGHT', 'POSTFLIGHT'];

export default function AdminChecklists() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canEdit = canEditChecklistTemplates(user);
  const [target, setTarget] = useState<{ aircraftType: AircraftType; phase: ChecklistPhase; existing?: ChecklistTemplate } | null>(null);

  const publishedByPhase = (phase: ChecklistPhase) =>
    state.checklistTemplates.filter(t => t.phase === phase && t.status === 'PUBLISHED');

  const onPublished = (t: ChecklistTemplate) => dispatch({ type: 'ADD_CHECKLIST_TEMPLATE', payload: t });

  return (
    <TechLogShell title="Admin · Checklists" subtitle={canEdit ? 'DOM / Chief Inspector — publish creates a new version; prior versions stay bound to their signed instances.' : 'Read-only — a DOM or Chief Inspector can edit these.'}>
      <div className="space-y-6">
        {PHASES.map(phase => (
          <div key={phase}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{phase === 'PREFLIGHT' ? 'Preflight' : 'Postflight'}</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {AIRCRAFT_TYPES.map(aircraftType => {
                const t = latestPublishedTemplate(state.checklistTemplates, aircraftType, phase);
                return (
                  <Card key={`${aircraftType}-${phase}`}>
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{aircraftType}</span>
                        {t ? <Badge variant="secondary">v{t.version}</Badge> : <Badge variant="outline">none</Badge>}
                      </div>
                      {t
                        ? <div className="text-xs text-muted-foreground">{t.aodReference ?? '—'} · {t.sections.reduce((n, s) => n + s.items.length, 0)} items · {interactionModeOf(t) === 'SINGLE_TAP' ? 'single tap' : 'claim + complete'}</div>
                        : <div className="text-xs text-muted-foreground">No checklist published yet.</div>}
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => setTarget({ aircraftType, phase, existing: t })}>
                          {t ? <><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</> : <><Plus className="mr-1.5 h-3.5 w-3.5" /> Create</>}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {target && (
        <ChecklistTemplateEditor
          open={!!target}
          onOpenChange={o => !o && setTarget(null)}
          aircraftType={target.aircraftType}
          phase={target.phase}
          existing={target.existing}
          cloneCandidates={publishedByPhase(target.phase)}
          onPublished={onPublished}
        />
      )}
    </TechLogShell>
  );
}
