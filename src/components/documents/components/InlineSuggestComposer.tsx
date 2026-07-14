import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import type { Doc, DocRevision } from '../types';
import { useDocuments, publishSuggestionFiledEvent, identityFor } from '../DocumentsContext';
import { useOffline } from '../hooks/useOffline';
import { queueOutbox } from '../store/offlineController';

/** Block-anchored suggestion composer, shown inline in the reader gutter. */
export function InlineSuggestComposer({
  doc, rev, blockId, userRole, onDone,
}: { doc: Doc; rev: DocRevision; blockId: string; userRole: string; onDone: () => void }) {
  const { addSuggestion } = useDocuments();
  const { online } = useOffline();
  const [proposedChange, setProposedChange] = useState('');
  const [rationale, setRationale] = useState('');

  const submit = () => {
    if (proposedChange.trim().length < 10) { toast.error('Describe the change (at least a sentence).'); return; }
    if (rationale.trim().length < 5) { toast.error('A brief rationale is required.'); return; }
    // Written durably to local state now (survives offline); if offline, also queued
    // in the outbox to sync to the server/owner feed on reconnect (spec §8, D-9).
    addSuggestion({ doc, rev, blockId, proposedChange, rationale, userRole });
    if (online) {
      publishSuggestionFiledEvent(doc, identityFor(userRole).userName);
      toast.success(`Suggestion filed — routed to ${doc.ownerName}.`);
    } else {
      void queueOutbox('suggestion', `Suggestion on ${doc.id}`);
      toast.success('Saved offline — queued; will sync when you reconnect.');
    }
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
