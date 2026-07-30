import { useState } from 'react';
import { ClipboardCheck, ListChecks } from 'lucide-react';
import type { Aircraft, ChecklistInstance, ChecklistTemplate } from '../../types';
import { useCurrentUser, useTechLog } from '../../TechLogContext';
import {
  claimItem, completeItem, markNotApplicable, checklistProgress,
  interactionModeOf, completeAllOpenChecks, batchMarkSummary,
} from '../../engine/checklist';
import { ChecklistItemRow } from './ChecklistItemRow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../ui/accordion';
import { Progress } from '../../../ui/progress';
import { Button } from '../../../ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../../../ui/alert-dialog';

const KIND_REASON: Record<string, string> = {
  MEASUREMENT: 'needs a reading typed in',
  NOTE: 'needs a note written',
};

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
  const mode = interactionModeOf(template);

  /** `null` = closed; `{ sectionId: undefined }` = the whole-checklist batch. */
  const [confirm, setConfirm] = useState<{ sectionId?: string } | null>(null);
  const pending = confirm ? batchMarkSummary(instance, template, confirm) : null;

  const entryFor = (itemDefId: string) => instance.entries.find(e => e.itemDefId === itemDefId)!;

  /** D58 — offered only in SINGLE_TAP mode, and only while there is something to mark. */
  const batchButton = (sectionId: string | undefined, label: string) => {
    if (mode !== 'SINGLE_TAP' || disabled) return null;
    const { willMark } = batchMarkSummary(instance, template, { sectionId });
    if (!willMark.length) return null;
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirm({ sectionId })}>
        <ListChecks className="mr-1.5 h-3.5 w-3.5" /> {label} ({willMark.length})
      </Button>
    );
  };

  const runBatch = () => {
    if (!confirm) return;
    onChange(completeAllOpenChecks(instance, template, user.oid, new Date().toISOString(), confirm));
    setConfirm(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <ClipboardCheck className="h-4 w-4" />
        <span className="font-medium">{aircraft.tailNumber} · {template.phase === 'PREFLIGHT' ? 'Preflight' : 'Postflight'}{template.aodReference ? ` (${template.aodReference})` : ''}</span>
        <span className="ml-auto text-xs text-muted-foreground">{progress.done}/{progress.total}</span>
      </div>
      <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
      {batchButton(undefined, 'Mark remaining done')}
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
                  mode={mode}
                  disabled={disabled}
                  onClaim={() => onChange(claimItem(instance, item.id, user.oid, new Date().toISOString()))}
                  onComplete={(values, note) => onChange(completeItem(instance, template, item.id, user.oid, new Date().toISOString(), { values, note }))}
                  onNA={reason => onChange(markNotApplicable(instance, template, item.id, user.oid, new Date().toISOString(), reason))}
                />
              ))}
              {batchButton(section.id, `Mark rest of ${section.title} done`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* The confirm step states what the tap marks AND what it deliberately leaves open, by name —
          a batch action whose scope you have to infer is one you cannot sign behind. */}
      <AlertDialog open={!!confirm} onOpenChange={(o: boolean) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {pending?.willMark.length ?? 0} item{pending?.willMark.length === 1 ? '' : 's'} done?</AlertDialogTitle>
            <AlertDialogDescription>
              This records you as having completed {pending?.willMark.length === 1 ? 'this item' : 'these items'} just now, on {aircraft.tailNumber}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 space-y-3 overflow-y-auto text-sm">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Will be marked done</div>
              <ul className="list-disc pl-5">
                {pending?.willMark.map(i => <li key={i.id}>{i.label}</li>)}
              </ul>
            </div>
            {!!pending?.willSkip.length && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Will be left for you to complete</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {pending.willSkip.map(i => (
                    <li key={i.id}>
                      {i.label} — {entryFor(i.id).state === 'IN_PROGRESS'
                        ? `in progress with ${nameOf(entryFor(i.id).startedByOid)}`
                        : KIND_REASON[i.kind] ?? 'needs your input'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBatch}>Mark {pending?.willMark.length ?? 0} done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
