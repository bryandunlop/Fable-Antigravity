import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Edit,
  Eye,
  Fuel,
  MapPin,
  Phone,
  Plane,
  Radio,
  ShieldCheck,
} from 'lucide-react';

import type { CompanyAirportPageContent, ConfirmableField } from '../../airport/company/pageStore';
import type { AirportRecord, RunwayRecord } from '../../airport/types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { AirportFlags } from './AirportFlags';
import { useCompanyAirport } from './CompanyAirportContext';
import { NotPublished, ProvenanceChip } from './ProvenanceChip';
import { RunwayDiagram } from './RunwayDiagram';

interface AirportReferenceDetailProps {
  airport: AirportRecord;
  onBack: () => void;
  /**
   * Omitted while the propose/review/publish flow is unwired (D46). When absent
   * the control renders disabled and says so, rather than presenting a live
   * primary action that silently swallows the click.
   */
  onSubmitCorrection?: () => void;
  /** Whose read receipt an acknowledgement records (D47). Real identity lands with auth. */
  currentUserOid?: string;
}

/**
 * A NASR cycle date is a calendar date, not an instant — formatting it through
 * the viewer's timezone shifts it a day backwards west of UTC, which would show
 * the 09 Jul cycle as 8 Jul for everyone in the US.
 */
function formatCycle(effectiveDate: string): string {
  const [year, month, day] = effectiveDate.split('/');
  if (!year || !month || !day) return effectiveDate;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}

/**
 * The handful of facts a crew checks first, above the fold and without scrolling.
 * Deliberately short — a tile row that tries to show everything is another table.
 */
function AirportGlance({ airport }: { airport: AirportRecord }) {
  const longest = Math.max(0, ...airport.runways.map((r) => r.lengthFt ?? 0));
  const weights = airport.runways
    .map((r) => r.pavement.grossWeight?.dualWheelLb)
    .filter((v): v is number => typeof v === 'number');

  const tiles: { label: string; value: React.ReactNode; muted?: boolean }[] = [
    { label: 'Longest runway', value: longest ? `${longest.toLocaleString()} ft` : '—' },
    {
      label: 'Elevation',
      value: airport.elevationFt !== null ? `${Math.round(airport.elevationFt).toLocaleString()} ft` : '—',
    },
    {
      label: 'Dual-wheel limit',
      value: weights.length ? `${Math.min(...weights).toLocaleString()} lb` : 'not published',
      muted: weights.length === 0,
    },
    { label: 'Tower', value: airport.towerTypeCode ?? 'none', muted: !airport.towerTypeCode },
    {
      label: 'Customs',
      value: airport.customsAvailable ? 'yes' : 'no',
      muted: !airport.customsAvailable,
    },
    {
      label: 'Fuel',
      value: airport.fuelTypes.length ? airport.fuelTypes.join(', ') : 'not published',
      muted: airport.fuelTypes.length === 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{tile.label}</p>
          <p
            className={`mt-0.5 font-medium tabular-nums ${tile.muted ? 'text-muted-foreground' : ''}`}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function DeclaredDistancesTable({ runway }: { runway: RunwayRecord }) {
  const anyPublished = runway.ends.some((end) => end.declaredDistances);

  if (!anyPublished) {
    return (
      <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
        The FAA publishes no declared distances for this runway. Use the runway length above with
        caution — it is not a substitute for TORA, TODA, ASDA or LDA.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-3 font-normal">End</th>
            <th className="text-right py-2 px-3 font-normal">TORA</th>
            <th className="text-right py-2 px-3 font-normal">TODA</th>
            <th className="text-right py-2 px-3 font-normal">ASDA</th>
            <th className="text-right py-2 px-3 font-normal">LDA</th>
            <th className="text-right py-2 px-3 font-normal">Displaced thr</th>
            <th className="text-left py-2 pl-3 font-normal">Approach lights</th>
          </tr>
        </thead>
        <tbody>
          {runway.ends.map((end) => {
            const d = end.declaredDistances;
            return (
              <tr key={end.endId} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{end.endId}</td>
                {[d?.toraFt, d?.todaFt, d?.asdaFt, d?.ldaFt].map((value, i) => (
                  <td key={i} className="py-2 px-3 text-right tabular-nums">
                    {value ?? <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {end.displacedThresholdFt ?? '—'}
                </td>
                <td className="py-2 pl-3 text-muted-foreground">
                  {end.approachLightingCode ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Distances are published per runway end and are frequently asymmetric — a displaced
        threshold shortens landing distance in one direction only.
      </p>
    </div>
  );
}

/**
 * Plain-language reading of the five-part code, per IAC 8 §5.1.4.3.12.
 * See ref-pavement-strength-reporting.
 */
const PAVEMENT_TYPE: Record<string, string> = { R: 'rigid', F: 'flexible' };
const SUBGRADE: Record<string, string> = {
  A: 'high subgrade',
  B: 'medium subgrade',
  C: 'low subgrade',
  D: 'ultra-low subgrade',
};
const TIRE_PRESSURE: Record<string, string> = {
  W: 'no tire-pressure limit',
  X: 'tire pressure to 254 psi',
  Y: 'tire pressure to 181 psi',
  Z: 'tire pressure to 73 psi',
};
const METHOD: Record<string, string> = {
  T: 'technically evaluated',
  U: 'rated from using aircraft',
};

function decodePavement(c: {
  pavementTypeCode: string;
  subgradeStrengthCode: string;
  tirePressureCode: string;
  evaluationMethodCode: string;
}): string {
  return [
    PAVEMENT_TYPE[c.pavementTypeCode],
    SUBGRADE[c.subgradeStrengthCode],
    TIRE_PRESSURE[c.tirePressureCode],
    METHOD[c.evaluationMethodCode],
  ]
    .filter(Boolean)
    .join(', ');
}

function PavementBlock({ runway }: { runway: RunwayRecord }) {
  const { classification, alsoPublished, grossWeight } = runway.pavement;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Pavement classification</p>
        {classification ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium font-mono">{classification.raw}</span>
            <ProvenanceChip
              source="reference"
              detail={classification.source === 'pcr-remark' ? 'PCR remark' : 'PCN field'}
            />
          </div>
        ) : (
          <NotPublished what="The FAA publishes no PCN or PCR for this runway" />
        )}
        {classification ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {decodePavement(classification)}. Compared against an aircraft&rsquo;s ACR, not against a
            weight — myGFO holds no ACR tables for this fleet, so it makes no suitability call here.
          </p>
        ) : null}
        {alsoPublished ? (
          <div className="mt-2 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The FAA also publishes{' '}
              <span className="font-mono font-medium">{alsoPublished.raw}</span> in the PCN field.
              The two sources disagree; both are shown rather than one being chosen.
            </span>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Weight bearing by gear configuration</p>
        {grossWeight ? (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-medium tabular-nums">
              {(
                [
                  ['Single wheel', grossWeight.singleWheelLb],
                  ['Dual wheel', grossWeight.dualWheelLb],
                  ['Two dual tandem', grossWeight.twoDualWheelsTandemLb],
                  ['Two dual double tandem', grossWeight.twoDualWheelsDoubleTandemLb],
                ] as const
              )
                .filter(([, value]) => value !== null)
                .map(([label, value]) => (
                  <span key={label}>
                    <span className="text-sm text-muted-foreground">{label} </span>
                    {value!.toLocaleString()} lb
                  </span>
                ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A gear configuration with no figure is one the FAA has not published a number for — not
              one the runway cannot take.
            </p>
          </>
        ) : (
          <NotPublished what="No weight-bearing capacity published" />
        )}
      </div>
    </div>
  );
}

const COMPANY_FIELDS: { key: keyof CompanyAirportPageContent; label: string }[] = [
  { key: 'ppr', label: 'PPR' },
  { key: 'curfew', label: 'Curfew' },
  { key: 'rampHandlingLimits', label: 'Ramp and handling limits' },
  { key: 'fboPreference', label: 'Preferred FBO / handler' },
  { key: 'opsNotes', label: 'Operations notes' },
];

function CompanyPageCard({
  icao,
  pendingCount,
  canPropose,
  currentUserOid,
  nasrCycleEffDate,
}: {
  icao: string;
  pendingCount: number;
  canPropose: boolean;
  currentUserOid: string;
  nasrCycleEffDate: string | null;
}) {
  const company = useCompanyAirport();
  const published = company.getLatest(icao);
  const states = company.confirmationStates(icao);
  const stateFor = new Map(states.map((state) => [state.field, state]));
  const acknowledgements = company.acknowledgements(icao);
  const myAcknowledgement = acknowledgements.find(
    (a) => a.crewOid === currentUserOid && a.companyPageVersionId === published?.id,
  );

  const written = COMPANY_FIELDS.filter(
    ({ key }) => typeof published?.content[key] === 'string' && published.content[key],
  );

  return (
    <Card className={published ? 'p-6' : 'border-dashed p-6'}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Company page</h2>
        <div className="flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pendingCount} awaiting review
            </span>
          ) : null}
          <ProvenanceChip
            source="company"
            detail={published ? `v${published.version}` : undefined}
          />
        </div>
      </div>

      {published ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {written.map(({ key, label }) => {
              // The confirmation caveat sits with the fact it qualifies, not at
              // the top of the page — a warning read once and scrolled past does
              // not travel with the value it is about (D54).
              const state = stateFor.get(key as ConfirmableField);
              return (
                <div key={key}>
                  <p className="text-sm text-muted-foreground mb-1">{label}</p>
                  <p className="whitespace-pre-wrap font-medium">
                    {published.content[key] as string}
                  </p>
                  {state?.lastConfirmed ? (
                    <p
                      className={`mt-1 text-xs ${
                        state.status === 'overdue'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {state.lastConfirmed.via === 'publish'
                        ? 'Written by the flight department'
                        : `Confirmed by ${state.lastConfirmed.by}`}{' '}
                      {new Date(state.lastConfirmed.atUtc).toLocaleDateString()}
                      {state.status === 'overdue'
                        ? ' — due for review, verify before you rely on it'
                        : ''}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          {written.length === 0 ? (
            <NotPublished what="Published, but every field is empty" />
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Version {published.version}, published by {published.publishedBy} on{' '}
              {new Date(published.publishedAtUtc).toLocaleString()}.
            </p>
            {myAcknowledgement ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                You marked this version seen on{' '}
                {new Date(myAcknowledgement.acknowledgedAtUtc).toLocaleDateString()}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => company.acknowledge(icao, currentUserOid, nasrCycleEffDate)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Mark as seen
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            &ldquo;Seen&rdquo; records which version you read, so what you were shown can be
            reconstructed later. It does not assert the page is correct.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          PPR, curfews, operations notes, FBO preference and handling limits are authored by the
          flight department — no vendor supplies them. Nothing has been published for this airport
          yet
          {canPropose
            ? '; use “Propose a change” to start one.'
            : ', and proposing changes is not available here.'}
        </p>
      )}
    </Card>
  );
}

export default function AirportReferenceDetail({
  airport,
  onBack,
  onSubmitCorrection,
  currentUserOid = 'demo-user',
}: AirportReferenceDetailProps) {
  const company = useCompanyAirport();
  const icao = airport.icaoId ?? airport.id;
  const pendingProposals = company
    .forAirport(icao)
    .filter((proposal) => proposal.status === 'pending' || proposal.status === 'approved').length;

  const attended = airport.attendance
    .map((slot) => `${slot.month}/${slot.day} ${slot.hour}`)
    .join(', ');

  // Every runway is drawn against the airport's longest, so they are comparable
  // with each other rather than each filling the width.
  const longestRunwayFt = Math.max(1, ...airport.runways.map((r) => r.lengthFt ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to airports
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl">{airport.icaoId ?? airport.id}</h1>
              {airport.icaoId ? (
                <span className="rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                  FAA {airport.id}
                </span>
              ) : (
                <span className="rounded border border-dashed px-2 py-0.5 text-sm text-muted-foreground">
                  No ICAO identifier
                </span>
              )}
              {airport.towerTypeCode ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-800">
                  <Radio className="h-4 w-4" />
                  {airport.towerTypeCode}
                </span>
              ) : null}
              {airport.customsAvailable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  Customs
                </span>
              ) : null}
            </div>
            <p className="text-xl text-muted-foreground">{airport.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[airport.city, airport.stateCode, airport.countyName ? `${airport.countyName} County` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button onClick={onSubmitCorrection} disabled={!onSubmitCorrection}>
              <Edit className="mr-2 h-4 w-4" />
              Propose a change
            </Button>
            {onSubmitCorrection ? null : (
              <span className="text-xs text-muted-foreground">Not wired up yet</span>
            )}
            <span className="text-xs text-muted-foreground">
              FAA NASR cycle {formatCycle(airport.effectiveDate)}
            </span>
          </div>
        </div>
      </div>

      <AirportGlance airport={airport} />

      <AirportFlags airport={airport} />

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Airport data</h2>
          <ProvenanceChip source="reference" detail={formatCycle(airport.effectiveDate)} />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Field label="Elevation">
            {airport.elevationFt !== null ? (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {airport.elevationFt} ft
              </span>
            ) : (
              <NotPublished />
            )}
          </Field>
          <Field label="Position">
            {airport.latitude !== null && airport.longitude !== null ? (
              <span className="flex items-center gap-2 tabular-nums">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
              </span>
            ) : (
              <NotPublished />
            )}
          </Field>
          <Field label="Magnetic variation">{airport.magneticVariation ?? <NotPublished />}</Field>
          <Field label="Attended hours">{attended || <NotPublished />}</Field>
          <Field label="Fuel">
            {airport.fuelTypes.length ? (
              <span className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                {airport.fuelTypes.join(', ')}
              </span>
            ) : (
              <NotPublished what="No fuel grades published" />
            )}
          </Field>
          <Field label="Landing fee">{airport.landingFee ? 'Yes' : 'Not indicated'}</Field>
          <Field label="Airport lighting">{airport.airportLightingSchedule ?? <NotPublished />}</Field>
          <Field label="FAR 139">{airport.far139TypeCode ?? 'Not certificated'}</Field>
          <Field label="Responsible ARTCC">{airport.artccId ?? <NotPublished />}</Field>
          <Field label="Ownership / use">
            {[airport.ownershipTypeCode, airport.facilityUseCode].filter(Boolean).join(' / ') || (
              <NotPublished />
            )}
          </Field>
          <Field label="Other services">
            {airport.otherServices.length ? airport.otherServices.join(', ') : <NotPublished />}
          </Field>
          <Field label="Last FAA inspection">{airport.lastInspection ?? <NotPublished />}</Field>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Plane className="h-5 w-5" />
            Runways
          </h2>
          <ProvenanceChip source="reference" detail={formatCycle(airport.effectiveDate)} />
        </div>

        <div className="space-y-8">
          {airport.runways.map((runway) => (
            <div key={runway.runwayId} className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-2">
                <h3 className="text-lg font-medium">{runway.runwayId}</h3>
                <span className="tabular-nums text-muted-foreground">
                  {runway.lengthFt} × {runway.widthFt} ft
                </span>
                <span className="text-muted-foreground">{runway.surfaceTypeCode}</span>
                {runway.condition ? (
                  <span className="text-muted-foreground">· {runway.condition}</span>
                ) : null}
                {runway.lightingCode ? (
                  <span className="text-muted-foreground">· {runway.lightingCode} intensity</span>
                ) : null}
              </div>

              <RunwayDiagram runway={runway} scaleMax={longestRunwayFt} />

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Declared distances</p>
                  <DeclaredDistancesTable runway={runway} />
                </div>
                <PavementBlock runway={runway} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Airport contacts</h2>
          <ProvenanceChip source="reference" detail={formatCycle(airport.effectiveDate)} />
        </div>
        {airport.contacts.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {airport.contacts.map((contact, index) => (
              <div key={index} className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {contact.title ?? 'Contact'}
                </p>
                <p className="font-medium">{contact.name ?? '—'}</p>
                {contact.phone ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <NotPublished what="No airport contacts published" />
        )}
      </Card>

      <CompanyPageCard
        icao={icao}
        pendingCount={pendingProposals}
        canPropose={Boolean(onSubmitCorrection)}
        currentUserOid={currentUserOid}
        nasrCycleEffDate={airport.effectiveDate}
      />
    </div>
  );
}
