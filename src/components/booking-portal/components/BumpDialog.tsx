// Bumping an approved trip for a senior one.
//
// Two fields, both required, and the reason is NOT shown to the losing EA when it is
// written. She reads "Working — scheduling will call you" until a scheduler marks the call
// as made. Nobody should learn they were outranked from a colour changing on a web page.

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';

export function BumpDialog({
  requestId,
  onClose,
  onBump,
}: {
  requestId: string | null;
  onClose: () => void;
  onBump: (authorizedBy: string, reason: string) => void;
}) {
  const [who, setWho] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (requestId) { setWho(''); setReason(''); }
  }, [requestId]);

  return (
    <Dialog open={!!requestId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Bump {requestId} for a senior trip</DialogTitle>
          <DialogDescription>
            This puts the trip back to pending. Nothing was booked, so nothing is un-booked — but
            someone is losing their place, and a person has to own that.
          </DialogDescription>
        </DialogHeader>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Authorised by</span>
          <input
            aria-label="Authorised by"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            placeholder="Who made this call"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          />
        </label>

        <label className="mt-2 block text-sm">
          <span className="mb-1 block font-medium">Reason</span>
          <textarea
            aria-label="Reason"
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            placeholder="Why the senior trip takes this slot"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Not shown to her yet. She reads “Working — scheduling will call you” until you mark
            the call as made.
          </span>
        </label>

        <DialogFooter className="mt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!who.trim() || !reason.trim()} onClick={() => onBump(who, reason)}>
            Bump
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
