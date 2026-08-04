// Requests list — the EA's view of everything in flight, with the declined
// ones surfaced for resubmit rather than buried.

import { Link } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { Card, StatusChip } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { routeLabel } from '../engine/lifecycle';

export default function Requests() {
  const { state } = usePortal();
  const requests = state.requests.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <PortalShell
      title="Trip requests"
      actions={
        <Link to="/booking-portal/requests/new" className="bg-[#0096FC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077CC]">
          New trip request
        </Link>
      }
    >
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Request</th>
              <th className="px-4 py-2.5">Route</th>
              <th className="px-4 py-2.5">Dates</th>
              <th className="px-4 py-2.5">Principal</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const principal = state.passengers.find((p) => p.id === r.principalId);
              const dates = r.legs.length
                ? `${r.legs[0].date}${r.legs.length > 1 ? ` – ${r.legs[r.legs.length - 1].date}` : ''}`
                : '—';
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link to={`/booking-portal/requests/${r.id}`} className="font-semibold text-[#0077CC] dark:text-[#4FB6FD]">
                      {r.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{routeLabel(r)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{dates}</td>
                  <td className="px-4 py-2.5">{principal?.name ?? '—'}</td>
                  <td className="px-4 py-2.5"><StatusChip status={r.status} /></td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </PortalShell>
  );
}
