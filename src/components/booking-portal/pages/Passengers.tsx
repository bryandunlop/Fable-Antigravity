// Frame E — passenger profiles: document states evaluated against travel
// dates, the form review loop, and the EA's per-principal authority.

import { PortalShell } from '../components/PortalShell';
import { AsOf, Card, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { evaluateDoc } from '../engine/docExpiry';
import type { Passenger } from '../types';

function DocRow({ passenger, docId }: { passenger: Passenger; docId: string }) {
  const doc = passenger.docs.find((d) => d.id === docId)!;
  const verdict =
    passenger.nextTravelStart && passenger.nextTravelEnd
      ? evaluateDoc(doc.expires, passenger.nextTravelStart, passenger.nextTravelEnd)
      : 'valid';
  return (
    <tr className="border-t border-border text-sm">
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
}

export default function Passengers() {
  const { state } = usePortal();
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const principals = state.passengers.filter((p) => p.kind === 'principal');
  const others = state.passengers.filter((p) => p.kind !== 'principal');

  return (
    <PortalShell title="Passengers" meta={<AsOf>Profiles read through from CRM {asOf} — nothing stored here</AsOf>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          {principals.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold">{p.name} <Chip tone="gold" className="ml-1.5">Principal</Chip></p>
                {p.eaLevel && <Chip tone={p.eaLevel === 'view' ? 'neutral' : 'info'}>Your access: {p.eaLevel}</Chip>}
              </div>
              {p.docs.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="pb-1.5 pr-3">Document</th>
                      <th className="pb-1.5 pr-3">Number</th>
                      <th className="pb-1.5 pr-3">Expires</th>
                      <th className="pb-1.5">Against next travel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.docs.map((d) => <DocRow key={d.id} passenger={p} docId={d.id} />)}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">No documents on file.</p>
              )}
              {p.formStatus === 'resubmit' && (
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <Chip tone="flag">Resubmission requested</Chip>
                  <p className="mt-1.5 text-muted-foreground">Scheduling: "{p.formNote}"</p>
                  <button type="button" className="mt-2 border border-[#0096FC] px-3 py-1 text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]">Reopen form</button>
                </div>
              )}
              {p.prefs && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{p.prefs}</p>}
            </Card>
          ))}

          <SectionLabel>Guests &amp; staff</SectionLabel>
          <Card>
            {others.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-0">
                <span>{p.name} <span className="text-xs text-muted-foreground">{p.kind}</span></span>
                <span className="flex items-center gap-2">
                  {!p.hasFlown && <Chip tone="neutral">Never flown — form auto-sends on first approval</Chip>}
                  {p.formStatus === 'approved' && <Chip tone="ok">Form current</Chip>}
                </span>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <SectionLabel>Your authority</SectionLabel>
            <table className="w-full text-sm">
              <tbody>
                {principals.map((p) => (
                  <tr key={p.id} className="border-t border-border first:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right">
                      <Chip tone={p.eaLevel === 'view' ? 'neutral' : 'info'}>{p.eaLevel ?? '—'}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-muted-foreground">
              View: trips + itineraries. Book: + request, manifest, forms. Full: + profile, documents, preferences.
            </p>
          </Card>
          <Card className="p-4 text-xs text-muted-foreground">
            Documents are read through from CRM at view time and never stored in myGFO; the flag/block verdicts and
            form states are myGFO workflow state, keyed by external reference.
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
