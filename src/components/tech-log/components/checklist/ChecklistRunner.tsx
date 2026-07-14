import { ClipboardCheck } from 'lucide-react';
import type { Aircraft, ChecklistInstance, ChecklistTemplate } from '../../types';
import { useCurrentUser, useTechLog } from '../../TechLogContext';
import { claimItem, completeItem, markNotApplicable, checklistProgress } from '../../engine/checklist';
import { ChecklistItemRow } from './ChecklistItemRow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../ui/accordion';
import { Progress } from '../../../ui/progress';

export function ChecklistRunner({
  aircraft, template, instance, onChange, disabled,
}: {
  aircraft: Aircraft;
  template: ChecklistTemplate;
  instance: ChecklistInstance;
  onChange: (next: ChecklistInstance) => void;
  disabled?: boolean;
}) {
  const { state } = useTechLog();
  const user = useCurrentUser();
  const nameOf = (oid?: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid ?? '—';
  const progress = checklistProgress(instance, template);

  const entryFor = (itemDefId: string) => instance.entries.find(e => e.itemDefId === itemDefId)!;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <ClipboardCheck className="h-4 w-4" />
        <span className="font-medium">{aircraft.tailNumber} · {template.phase === 'PREFLIGHT' ? 'Preflight' : 'Postflight'}{template.aodReference ? ` (${template.aodReference})` : ''}</span>
        <span className="ml-auto text-xs text-muted-foreground">{progress.done}/{progress.total}</span>
      </div>
      <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
      <Accordion type="multiple" defaultValue={template.sections.map(s => s.id)}>
        {template.sections.map(section => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {section.items.map(item => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  entry={entryFor(item.id)}
                  nameOf={nameOf}
                  currentUserOid={user.oid}
                  disabled={disabled}
                  onClaim={() => onChange(claimItem(instance, item.id, user.oid, new Date().toISOString()))}
                  onComplete={(values, note) => onChange(completeItem(instance, item.id, user.oid, new Date().toISOString(), { values, note }))}
                  onNA={reason => onChange(markNotApplicable(instance, template, item.id, user.oid, new Date().toISOString(), reason))}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
