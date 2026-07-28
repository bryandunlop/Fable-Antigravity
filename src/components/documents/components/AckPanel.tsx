import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, PenLine, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import type { Personnel } from '../../tech-log/types';
import { SignCeremonyDialog } from '../../tech-log/components/SignCeremonyDialog';
import type { Doc, DocRevision } from '../types';
import { useDocuments, identityFor } from '../DocumentsContext';
import { isAcknowledged, acknowledgedFor, isTargetRole } from '../engine/acknowledgments';

/**
 * Level-aware acknowledgment capture:
 *  - 'initials'  → the bulletins checkbox + typed-initials UX
 *  - 'signature' → the shared tech-log sign ceremony (intent + step-up + content hash)
 * A revision with a change summary gates the ack behind "I have reviewed the changes".
 */
export function AckPanel({ doc, rev, userRole }: { doc: Doc; rev: DocRevision; userRole: string }) {
  const { state, acknowledgeInitials, acknowledgeSignature } = useDocuments();
  const [checked, setChecked] = useState(false);
  const [initials, setInitials] = useState('');
  const [ceremonyOpen, setCeremonyOpen] = useState(false);

  if (!rev.requireAcknowledgment || rev.ackLevel === 'none') return null;
  if (!isTargetRole(doc, userRole)) return null;

  const { userId, userName } = identityFor(userRole);
  const acked = isAcknowledged(rev, state.acknowledgments, userId);
  const myAck = acknowledgedFor(rev, state.acknowledgments).find((a) => a.userId === userId);
  const hasChangeSummary = !!rev.changeSummary.trim();

  if (acked && myAck) {
    const sig = myAck.signatureId ? state.signatures.find((s) => s.id === myAck.signatureId) : undefined;
    return (
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm">
            {myAck.level === 'signature' ? (
              <>Read &amp; signed on {new Date(myAck.acknowledgedAtUtc).toLocaleString()}{sig ? <> · hash <span className="font-mono">{sig.contentHashShort}</span></> : null}.</>
            ) : (
              <>Read &amp; initialed ({myAck.initials}) on {new Date(myAck.acknowledgedAtUtc).toLocaleString()}.</>
            )}{' '}
            Applies to rev {myAck.revision}.
          </span>
        </div>
      </div>
    );
  }

  const confirmLabel = hasChangeSummary
    ? `I have read rev ${rev.revision} of "${doc.title}", including the summary of changes, and understand its contents.`
    : `I have read and understand rev ${rev.revision} of "${doc.title}".`;

  const submitInitials = () => {
    if (!checked || initials.trim().length < 2) {
      toast.error('Check the box and enter your initials to confirm.');
      return;
    }
    acknowledgeInitials(doc, rev, initials, userRole);
    toast.success('Read & initial recorded.');
  };

  const signer: Personnel = {
    oid: userId,
    displayName: userName,
    role: userRole,
    riiAuthorized: false,
    riiAuthorizedAta: [],
    active: true,
  };

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <PenLine className="h-4 w-4" />
          {rev.ackLevel === 'signature' ? 'Signature acknowledgment required' : 'Acknowledgment required'}
          {rev.ackDueDate && <span className="font-normal">· due {new Date(`${rev.ackDueDate}T00:00:00`).toLocaleDateString()}</span>}
        </p>

        {rev.ackLevel === 'initials' ? (
          <>
            <div className="flex items-start gap-2">
              <Checkbox
                id="docAckCheck"
                checked={checked}
                onCheckedChange={(c: boolean | 'indeterminate') => setChecked(c as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="docAckCheck" className="cursor-pointer text-sm text-amber-900 dark:text-amber-200">
                {confirmLabel}
              </Label>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="docAckInitials" className="text-xs">Your initials</Label>
                <Input
                  id="docAckInitials"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value)}
                  placeholder="e.g. BD"
                  maxLength={4}
                  className="mt-1 w-24 uppercase"
                />
              </div>
              <Button onClick={submitInitials} size="sm">
                <PenLine className="mr-1.5 h-4 w-4" /> Initial &amp; record
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-start gap-2 text-xs text-amber-900/80 dark:text-amber-200/80">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This revision requires an electronic signature — the signed record binds your identity to this
              exact content (digest {rev.mockChecksum.slice(0, 12)}…).
            </p>
            <Button onClick={() => setCeremonyOpen(true)} size="sm">
              <PenLine className="mr-1.5 h-4 w-4" /> Read &amp; sign…
            </Button>
            <SignCeremonyDialog
              open={ceremonyOpen}
              onOpenChange={setCeremonyOpen}
              signer={signer}
              signedEntity="DOC_ACK"
              signedEntityId={rev.id}
              intentStatement={`I have read and understood ${doc.id} "${doc.title}" rev ${rev.revision}, effective ${rev.effectiveDate}${hasChangeSummary ? ', including the summary of changes' : ''}.`}
              requireStepUp
              payloadExtra={rev.mockChecksum}
              payloadSummary={`Signature covers the document content digest ${rev.mockChecksum.slice(0, 16)}…`}
              onSigned={(sig) => acknowledgeSignature(doc, rev, sig, userRole)}
              title="Read & sign acknowledgment"
            />
          </>
        )}
      </div>
    </div>
  );
}
