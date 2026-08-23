// Frame H — inbox: action-needed above the fold, FYI below. Only the top band
// ever triggers instant email; the bottom band goes to a daily digest.

import { CheckCircle2, Inbox as InboxIcon, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip, type ChipTone } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { cn } from '../../ui/utils';
import type { InboxItem } from '../types';

const KIND_TONE: Record<InboxItem['kind'], ChipTone> = {
  watch: 'gold', decision: 'block', reconfirm: 'flag', thread: 'neutral', form: 'neutral',
};
const KIND_LABEL: Record<InboxItem['kind'], string> = {
  watch: 'Watch', decision: 'Decision', reconfirm: 'Reconfirm', thread: 'Thread', form: 'Form',
};

function Row({ item, onRead }: { item: InboxItem; onRead: () => void }) {
  return (
    <button
      type="button"
      onClick={onRead}
      className="flex w-full flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', item.read ? 'bg-border' : 'bg-[var(--gfo-daylight,#0096FC)]')} />
      <span className={cn('min-w-0 flex-1', !item.read && 'font-medium')}>{item.text}</span>
      <Chip tone={KIND_TONE[item.kind]}>{KIND_LABEL[item.kind]}</Chip>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
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
    <PortalShell title="Inbox" meta={<AsOf>{action.length} needing action · {fyi.length} in today's digest</AsOf>}>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-error p-1.5"><Mail className="h-4 w-4" /></span>
              Action needed
              <Badge variant={action.length ? 'secondary' : 'outline'}>{action.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">these also send instant email</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {action.map((n) => <Row key={n.id} item={n} onRead={() => dispatch({ type: 'MARK_INBOX_READ', id: n.id })} />)}
            {action.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-[var(--gfo-success,#00B140)] opacity-60" />
                <p className="text-sm font-medium">Nothing needs you right now.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-info p-1.5"><InboxIcon className="h-4 w-4" /></span>
              FYI — in today's digest
              <Badge variant={fyi.length ? 'secondary' : 'outline'}>{fyi.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">batched, never an interruption</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {fyi.map((n) => <Row key={n.id} item={n} onRead={() => dispatch({ type: 'MARK_INBOX_READ', id: n.id })} />)}
            {fyi.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Quiet day.</p>}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
