// Requests — the EA's view of everything in flight. Declined requests are
// surfaced with their reason rather than buried, because the reason is the
// thing that tells the EA what to change.

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { RequestDrawer } from '../components/RequestDrawer';
import { RequestIdentityLine } from '../components/RequestIdentity';
import { AsOf, StatusChip } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import type { Passenger, TripRequest } from '../types';

// Hoisted: a component defined inside the render is a new type every pass, so
// React unmounts and remounts the whole section on each state change.
function RequestSection({
  title, rows, hint, accent, passengers, onOpen, onResubmit,
}: {
  title: string;
  rows: TripRequest[];
  hint: string;
  accent: string;
  passengers: Passenger[];
  onOpen: (id: string) => void;
  onResubmit: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
          <span className={`status-badge p-1.5 ${accent}`}><ClipboardList className="h-4 w-4" /></span>
          {title}
          <Badge variant={rows.length ? 'secondary' : 'outline'}>{rows.length}</Badge>
          <span className="text-xs font-normal text-muted-foreground">{hint}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-lg border">
              <button
                onClick={() => onOpen(r.id)}
                className="group flex w-full flex-wrap items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <RequestIdentityLine request={r} passengers={passengers} />
                <StatusChip status={r.status} />
              </button>
              {r.status === 'declined' && r.declineReason && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">"{r.declineReason}"</span>
                  <Button variant="outline" size="sm" onClick={() => onResubmit(r.id)}>
                    Edit &amp; resubmit
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Requests() {
  const { state, dispatch } = usePortal();
  const navigate = useNavigate();
  // A deep link to one request opens it in the drawer over this list rather
  // than on a page of its own — one implementation, and closing it leaves you
  // somewhere useful instead of nowhere.
  const { id: deepLinkId } = useParams();
  const [drawerId, setDrawerId] = useState<string | null>(deepLinkId ?? null);

  const requests = state.requests.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = requests.filter((r) => r.status !== 'confirmed' && r.status !== 'declined');
  const declined = requests.filter((r) => r.status === 'declined');
  const done = requests.filter((r) => r.status === 'confirmed');
  const resubmit = (id: string) => dispatch({ type: 'RESUBMIT_REQUEST', id });

  return (
    <PortalShell
      title="Trip requests"
      meta={<AsOf>{live.length} in flight · {declined.length} needing a change</AsOf>}
      actions={
        <Button asChild size="sm">
          <Link to="/booking-portal/requests/new"><Plus className="mr-1.5 h-4 w-4" /> New trip request</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <RequestSection title="In flight" rows={live} hint="submitted, waiting on a decision" accent="status-info" passengers={state.passengers} onOpen={setDrawerId} onResubmit={resubmit} />
        {declined.length > 0 && (
          <RequestSection title="Declined — needs a change" rows={declined} hint="the reason travels with the decision" accent="status-error" passengers={state.passengers} onOpen={setDrawerId} onResubmit={resubmit} />
        )}
        <RequestSection title="Confirmed" rows={done} hint="on the schedule — see Trips for the itinerary" accent="status-success" passengers={state.passengers} onOpen={setDrawerId} onResubmit={resubmit} />
      </div>

      <RequestDrawer
        requestId={drawerId}
        open={!!drawerId}
        onOpenChange={(o) => {
          if (o) return;
          setDrawerId(null);
          if (deepLinkId) navigate('/booking-portal/requests', { replace: true });
        }}
      />
    </PortalShell>
  );
}
