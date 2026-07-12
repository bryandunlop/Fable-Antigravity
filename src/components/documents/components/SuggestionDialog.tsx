import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import type { Doc, DocRevision } from '../types';
import { useDocuments, publishSuggestionFiledEvent, identityFor } from '../DocumentsContext';

function excerptOf(md: string): string {
  return md.replace(/[#>*`_|~-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function sectionLabel(number: string, title: string): string {
  return `${number ? `${number} ` : ''}${title}`.trim() || 'Preamble';
}

/** Reader feedback: suggest a change on the current revision, optionally anchored
 * to a specific block. Routed to the document owner's queue (Comply365-style
 * crew → manual loop). */
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
  const [blockId, setBlockId] = useState('');
  const [proposedChange, setProposedChange] = useState('');
  const [rationale, setRationale] = useState('');

  const groups = rev.sections.map((s) => ({
    label: sectionLabel(s.number, s.title),
    blocks: s.blocks.map((b) => ({ id: b.id, excerpt: excerptOf(b.md) || '(block)' })),
  }));

  const anchorSectionRef = (): string | undefined => {
    if (!blockId) return undefined;
    return groups.find((g) => g.blocks.some((b) => b.id === blockId))?.label;
  };

  const submit = () => {
    if (proposedChange.trim().length < 10) {
      toast.error('Describe the change you are proposing (at least a sentence).');
      return;
    }
    if (rationale.trim().length < 5) {
      toast.error('A brief rationale is required.');
      return;
    }
    addSuggestion({
      doc, rev, userRole, proposedChange, rationale,
      blockId: blockId || undefined,
      sectionRef: anchorSectionRef(),
    });
    publishSuggestionFiledEvent(doc, identityFor(userRole).userName);
    toast.success(`Suggestion filed — routed to ${doc.ownerName}.`);
    setBlockId('');
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
            <Label htmlFor="sugAnchor" className="text-xs">Which part?</Label>
            <select
              id="sugAnchor"
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">General — the whole document</option>
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.blocks.map((b) => (
                    <option key={b.id} value={b.id}>{b.excerpt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
