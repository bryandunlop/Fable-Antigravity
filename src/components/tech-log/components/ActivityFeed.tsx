import { useState } from 'react';
import { toast } from 'sonner';
import { Send, MessageSquare, FileSignature, StickyNote, ArrowUpRight } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveFeed, type FeedItem } from '../engine/feed';
import { buildPromotion } from '../engine/promote';
import { newId } from '../util/id';
import type { Aircraft, CoordinationMessage } from '../types';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

const KIND_META: Record<FeedItem['kind'], { label: string; cls: string; Icon: typeof MessageSquare }> = {
  EVENT: { label: 'SIGNED', cls: 'bg-blue-100 text-blue-900', Icon: FileSignature },
  RECORD: { label: 'RECORD', cls: 'bg-amber-100 text-amber-900', Icon: StickyNote },
  CHAT: { label: 'CHAT', cls: 'bg-muted text-muted-foreground', Icon: MessageSquare },
};

export function ActivityFeed({ aircraft, auditIds }: { aircraft: Aircraft; auditIds: Set<string> }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const now = new Date().toISOString();
  const [draft, setDraft] = useState('');

  const feed = deriveFeed(aircraft.id, state, auditIds, now);
  const nameOf = (oid?: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid ?? '—';

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: CoordinationMessage = { id: newId('cm'), aircraftId: aircraft.id, authorOid: user.oid, text, atUtc: new Date().toISOString() };
    dispatch({ type: 'ADD_COORDINATION_MESSAGE', payload: msg });
    setDraft('');
  };

  // Promote a chat message onto the latest open/deferred defect for this aircraft; toasts an error if none exists.
  const promote = (messageId: string) => {
    const m = state.coordinationMessages.find(c => c.id === messageId);
    if (!m) return;
    const openDefect = state.defects.find(d => d.aircraftId === aircraft.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
    const target = openDefect ? ({ type: 'DEFECT', id: openDefect.id } as const) : null;
    if (!target) return toast.error('No open defect to attach this to. Reply on a card to log a record note.');
    const { note, messagePatch } = buildPromotion(m, target, user.displayName, newId('rn'), new Date().toISOString());
    dispatch({ type: 'ADD_RECORD_NOTE', payload: note });
    dispatch({ type: 'EDIT_COORDINATION_MESSAGE', payload: messagePatch });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'NOTE_PROMOTED', entityType: 'RecordNote', entityId: note.id, atUtc: note.atUtc, summary: `${aircraft.tailNumber} chat promoted to a record note on defect ${target.id}` } });
    toast.success('Promoted to the record.');
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input placeholder="Message the crew / maintenance…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
            <Button onClick={send}><Send className="mr-1.5 h-4 w-4" /> Send</Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Posts to chat · promote a message to log it to the record.</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {feed.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        {feed.map(item => {
          const meta = KIND_META[item.kind];
          return (
            <div key={`${item.kind}-${item.id}`} className="flex items-start gap-2 rounded-md border p-2.5 text-sm">
              <span className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}><meta.Icon className="h-3 w-3" />{meta.label}</span>
              <div className="min-w-0 flex-1">
                <p>{item.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{nameOf(item.actorOid)} · {new Date(item.atUtc).toLocaleString()}</p>
              </div>
              {item.kind === 'CHAT' && item.promotable && (
                <Button size="sm" variant="ghost" onClick={() => promote(item.id)}><ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Promote</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
