import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import type { Doc, DocRevision } from '../types';
import { useDocuments, publishSuggestionFiledEvent, identityFor } from '../DocumentsContext';

/** Reader feedback: suggest a change on the current revision. Routed to the
 * document owner's queue (Comply365-style crew → manual loop). */
export function SuggestionDialog({
  open,
  onOpenChange,
  doc,
  rev,
  userRole,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: Doc;
  rev: DocRevision;
  userRole: string;
}) {
  const { addSuggestion } = useDocuments();
  const [sectionRef, setSectionRef] = useState('');
  const [proposedChange, setProposedChange] = useState('');
  const [rationale, setRationale] = useState('');

  const submit = () => {
    if (proposedChange.trim().length < 10) {
      toast.error('Describe the change you are proposing (at least a sentence).');
      return;
    }
    if (rationale.trim().length < 5) {
      toast.error('A brief rationale is required.');
      return;
    }
    addSuggestion({ doc, rev, sectionRef: sectionRef.trim() || undefined, proposedChange, rationale, userRole });
    publishSuggestionFiledEvent(doc, identityFor(userRole).userName);
    toast.success(`Suggestion filed — routed to ${doc.ownerName}.`);
    setSectionRef('');
    setProposedChange('');
    setRationale('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" /> Suggest a change
          </DialogTitle>
          <DialogDescription>
            {doc.id} rev {rev.revision} — your suggestion goes to the document owner ({doc.ownerName}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sugSection" className="text-xs">Which part? (optional)</Label>
            <Input
              id="sugSection"
              value={sectionRef}
              onChange={(e) => setSectionRef(e.target.value)}
              placeholder='e.g. "Go-Around Callout" or "§3.5 Fuel Policy"'
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sugChange" className="text-xs">Proposed change</Label>
            <Textarea id="sugChange" value={proposedChange} onChange={(e) => setProposedChange(e.target.value)} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="sugWhy" className="text-xs">Why</Label>
            <Textarea id="sugWhy" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>File suggestion</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
