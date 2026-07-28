import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PenLine, ShieldCheck, Fingerprint, Paperclip } from 'lucide-react';
import type { Personnel, Signature, SignedEntity } from '../types';
import { makeSignature } from '../engine/signing';
import { newId } from '../util/id';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export function SignCeremonyDialog({
  open,
  onOpenChange,
  signer,
  signedEntity,
  signedEntityId,
  intentStatement,
  requireStepUp = false,
  certNumber,
  validate,
  onSigned,
  title = 'Electronic signature',
  payloadExtra,
  payloadSummary,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signer: Personnel;
  signedEntity: SignedEntity;
  signedEntityId: string;
  intentStatement: string;
  requireStepUp?: boolean;
  certNumber?: string;
  validate?: () => { ok: boolean; error?: string };
  onSigned: (sig: Signature) => void;
  title?: string;
  payloadExtra?: string;       // extra bytes folded into the content hash (e.g. attachment digests)
  payloadSummary?: ReactNode;  // human note shown in the ceremony, e.g. "Covers 2 attachments"
}) {
  const [pin, setPin] = useState('');
  const stepUpOk = !requireStepUp || pin.trim().length >= 4;

  const sign = () => {
    const v = validate?.();
    if (v && !v.ok) {
      toast.error(v.error ?? 'Signature blocked.');
      return;
    }
    const sig = makeSignature({
      id: newId('sig'),
      signedEntity,
      signedEntityId,
      signer,
      intentStatement,
      signedAtUtc: new Date().toISOString(),
      certNumber: certNumber ?? signer.apCertificateNumber,
      payloadExtra,
    });
    onSigned(sig);
    setPin('');
    onOpenChange(false);
    toast.success(`Signed by ${signer.displayName}`, { description: `Hash ${sig.contentHashShort} · ${sig.amr.join('+')}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>AC 120-78B electronic signature (simulated for demo).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3">
            <div className="font-medium">{signer.displayName}</div>
            <div className="text-xs text-muted-foreground">
              {signer.role}
              {certNumber || signer.apCertificateNumber ? ` · A&P ${certNumber ?? signer.apCertificateNumber}` : ''}
            </div>
          </div>

          <div className="rounded-md border-l-4 border-l-primary bg-muted/50 p-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intent</div>
            {intentStatement}
          </div>

          {payloadSummary && (
            <div className="flex items-start gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{payloadSummary}</span>
            </div>
          )}

          {requireStepUp ? (
            <div>
              <Label htmlFor="stepup-pin" className="flex items-center gap-1.5">
                <Fingerprint className="h-3.5 w-3.5" /> Step-up re-authentication (simulated)
              </Label>
              <Input
                id="stepup-pin"
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN / biometric"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">Higher-stakes sign-off — fresh-auth required (any 4+ chars for the demo).</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Authenticated session — sole-control affirmed by the deliberate Sign action.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={sign} disabled={!stepUpOk}>
            <PenLine className="mr-1.5 h-4 w-4" /> Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
