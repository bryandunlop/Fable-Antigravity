// The EA ↔ scheduling thread, lifted out of RequestDrawer (D100) so the request
// drawer and the EA command center's trip panel are literally the same
// conversation component — a trip-scoped chat that looked different from the
// request thread would read as a second, competing inbox.

import { useState } from 'react';
import { Button } from '../../ui/button';
import { usePortal } from '../BookingPortalContext';
import type { ThreadMessage } from '../types';
import { cn } from '../../ui/utils';

/** Scheduling's one-tap acknowledgement — Delta Messenger's "we're working on it"
 *  interim state (ref: Booking Systems Research 2026-08). The gap between an EA's
 *  question and its answer is where she picks up the phone. */
const WORKING_ON_IT = 'Working on it — I’ll come back on this shortly.';

export function MessageThread({
  messages,
  threadId,
  emptyHint = 'No messages yet — rejections, resubmits, and post-lockout changes all land here.',
  label = 'Message board — EA ↔ scheduling',
}: {
  messages: ThreadMessage[];
  /** The entity the thread hangs off — a request id today, since a confirmed
   *  trip's id IS its originating request's id. */
  threadId: string;
  emptyHint?: string;
  label?: string;
}) {
  const { state, dispatch } = usePortal();
  const [message, setMessage] = useState('');

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: 'POST_MESSAGE', id: threadId, text: t });
    setMessage('');
  };

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2.5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-lg border px-3 py-2 text-sm',
              m.from === 'ea'
                ? 'self-end border-transparent bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_10%,transparent)]'
                : 'bg-muted/50',
            )}
          >
            <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {m.author} · {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{emptyHint}</p>}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          aria-label="Write a message"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
          placeholder={`Write as ${state.persona === 'ea' ? 'Dana (EA)' : state.persona === 'executive' ? 'yourself' : 'scheduling'}…`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(message); }}
        />
        <Button size="sm" disabled={!message.trim()} onClick={() => send(message)}>Send</Button>
      </div>

      {state.persona === 'scheduling' && (
        <button
          type="button"
          onClick={() => send(WORKING_ON_IT)}
          className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Send “working on it”
        </button>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">Principals see outcomes, not this thread.</p>
    </div>
  );
}
