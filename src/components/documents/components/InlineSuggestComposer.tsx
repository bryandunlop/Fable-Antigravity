import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import type { Doc, DocRevision } from '../types';
import { useDocuments, publishSuggestionFiledEvent, identityFor } from '../DocumentsContext';

/** Block-anchored suggestion composer, shown inline in the reader gutter. */
export function InlineSuggestComposer({
  doc, rev, blockId, userRole, onDone,
}: { doc: Doc; rev: DocRevision; blockId: string; userRole: string; onDone: () => void }) {
  const { addSuggestion } = useDocuments();
  const [proposedChange, setProposedChange] = useState('');
  const [rationale, setRationale] = useState('');

  const submit = () => {
    if (proposedChange.trim().length < 10) { toast.error('Describe the change (at least a sentence).'); return; }
    if (rationale.trim().length < 5) { toast.error('A brief rationale is required.'); return; }
    addSuggestion({ doc, rev, blockId, proposedChange, rationale, userRole });
    publishSuggestionFiledEvent(doc, identityFor(userRole).userName);
    toast.success(`Suggestion filed — routed to ${doc.ownerName}.`);
    onDone();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-sky-800 dark:text-sky-300">Suggest an edit to this paragraph</p>
      <Textarea value={proposedChange} onChange={(e) => setProposedChange(e.target.value)} rows={3} placeholder="Proposed change" />
      <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} placeholder="Why" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button size="sm" onClick={submit}>File suggestion</Button>
      </div>
    </div>
  );
}
