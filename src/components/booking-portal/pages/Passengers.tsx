// Frame E — passenger profiles: document states evaluated against travel
// dates, the form review loop, and the EA's per-principal authority.

import { ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { evaluateDoc } from '../engine/docExpiry';
import type { Passenger } from '../types';

function DocTable({ passenger }: { passenger: Passenger }) {
  if (passenger.docs.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents on file.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 pr-3">Document</th>
            <th className="py-1.5 pr-3">Number</th>
            <th className="py-1.5 pr-3">Expires</th>
            <th className="py-1.5">Against next travel</th>
          </tr>
        </thead>
        <tbody>
          {passenger.docs.map((doc) => {
            const verdict =
              passenger.nextTravelStart && passenger.nextTravelEnd
                ? evaluateDoc(doc.expires, passenger.nextTravelStart, passenger.nextTravelEnd)
                : 'valid';
            return (
              <tr key={doc.id} className="border-b last:border-0">
                <td className="py-2 pr-3">{doc.label}</td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{doc.numberMasked}</td>
                <td className="py-2 pr-3 tabular-nums">{doc.expires}</td>
                <td className="py-2">
                  {verdict === 'valid' && <Chip tone="ok">Valid</Chip>}
                  {verdict === 'flag' && <Chip tone="flag">Flag · &lt; 6 mo after travel</Chip>}
                  {verdict === 'block' && <Chip tone="block">Block · expires before travel</Chip>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Passengers() {
  const { state } = usePortal();
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const principals = state.passengers.filter((p) => p.kind === 'principal');
  const others = state.passengers.filter((p) => p.kind !== 'principal');

  return (
    <PortalShell title="Passengers" meta={<AsOf>Read through from CRM {asOf} — nothing stored in myGFO</AsOf>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          {principals.map((p) => (
            <Card key={p.id}>
              <CardHeader className="py-4">
                <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                  <span className="status-badge status-info p-1.5"><Users className="h-4 w-4" /></span>
                  {p.name}
                  <Badge variant="secondary" className="text-[10px]">Principal</Badge>
                  {p.eaLevel && (
                    <span className="text-xs font-normal text-muted-foreground">your access: {p.eaLevel}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <DocTable passenger={p} />
                {p.formStatus === 'resubmit' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <Chip tone="flag">Resubmission requested</Chip>
                      <span className="text-muted-foreground">Scheduling: "{p.formNote}"</span>
                    </span>
                    <Button variant="outline" size="sm">Reopen form</Button>
                  </div>
                )}
                {p.prefs && <p className="text-xs text-muted-foreground">{p.prefs}</p>}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                <span className="status-badge status-info p-1.5"><Users className="h-4 w-4" /></span>
                Guests &amp; staff
                <Badge variant="secondary">{others.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {others.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm">
                  <span>{p.name} <span className="text-xs text-muted-foreground">{p.kind}</span></span>
                  <span className="flex flex-wrap gap-1.5">
                    {!p.hasFlown && <Chip tone="neutral">Never flown — form auto-sends on first approval</Chip>}
                    {p.formStatus === 'approved' && <Chip tone="ok">Form current</Chip>}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="status-badge status-success p-1.5"><ShieldCheck className="h-4 w-4" /></span>
                Your authority
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <table className="w-full text-sm">
                <tbody>
                  {principals.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2 text-right">
                        <Chip tone={p.eaLevel === 'view' ? 'neutral' : 'info'}>{p.eaLevel ?? '—'}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                View: trips + itineraries. Book: + request, manifest, forms. Full: + profile, documents, preferences.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground">
              Documents are read through from CRM at view time and never stored in myGFO. The flag/block
              verdicts and form states are myGFO workflow state, keyed by external reference.
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
