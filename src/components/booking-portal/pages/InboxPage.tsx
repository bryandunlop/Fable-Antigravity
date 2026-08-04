// Frame H — inbox: action-needed above the fold, FYI below. Only the top band
// would ever trigger instant email; the bottom band goes to a daily digest.

import { PortalShell } from '../components/PortalShell';
import { Card, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { cn } from '../../ui/utils';
import type { InboxItem } from '../types';

const KIND_TONE = { watch: 'gold', decision: 'block', reconfirm: 'flag', thread: 'neutral', form: 'neutral' } as const;
const KIND_LABEL = { watch: 'Watch', decision: 'Decision', reconfirm: 'Reconfirm', thread: 'Thread', form: 'Form' } as const;

function Row({ item, onRead }: { item: InboxItem; onRead: () => void }) {
  return (
    <button
      type="button"
      onClick={onRead}
      className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40"
    >
      <span className={cn('h-2 w-2 rounded-full', item.read ? 'bg-border' : 'bg-[#0096FC]')} />
      <span className={cn(!item.read && 'font-medium')}>{item.text}</span>
      <Chip tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</Chip>
      <span className="tabular-nums text-xs text-muted-foreground">
        {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </button>
  );
}

export default function InboxPage() {
  const { state, dispatch } = usePortal();
  const action = state.inbox.filter((n) => n.actionNeeded);
  const fyi = state.inbox.filter((n) => !n.actionNeeded);

  return (
    <PortalShell title="Inbox">
      <SectionLabel>Action needed — these also send instant email</SectionLabel>
      <Card className="mb-6">
        {action.map((n) => <Row key={n.id} item={n} onRead={() => dispatch({ type: 'MARK_INBOX_READ', id: n.id })} />)}
        {action.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing needs you right now.</p>}
      </Card>
      <SectionLabel>FYI — in today's digest</SectionLabel>
      <Card>
        {fyi.map((n) => <Row key={n.id} item={n} onRead={() => dispatch({ type: 'MARK_INBOX_READ', id: n.id })} />)}
        {fyi.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Quiet day.</p>}
      </Card>
    </PortalShell>
  );
}
