import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Edit,
  Fuel,
  MapPin,
  Phone,
  Plane,
  Radio,
  ShieldCheck,
} from 'lucide-react';

import type { AirportRecord, RunwayRecord } from '../../airport/types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { NotPublished, ProvenanceChip } from './ProvenanceChip';

interface AirportReferenceDetailProps {
  airport: AirportRecord;
  onBack: () => void;
  /**
   * Omitted while the propose/review/publish flow is unwired (D46). When absent
   * the control renders disabled and says so, rather than presenting a live
   * primary action that silently swallows the click.
   */
  onSubmitCorrection?: () => void;
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
                  ['Single wheel', grossWeight.singleWheel],
                  ['Dual wheel', grossWeight.dualWheel],
                  ['Two dual tandem', grossWeight.twoDualWheelsTandem],
                  ['Two dual double tandem', grossWeight.twoDualWheelsDoubleTandem],
                ] as const
              )
                .filter(([, value]) => value !== null)
                .map(([label, value]) => (
                  <span key={label}>
                    <span className="text-sm text-muted-foreground">{label} </span>
                    {value}
                  </span>
                ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Values are shown exactly as the FAA publishes them. No FAA document in the NASR
              bundle states their unit, so no unit is displayed and no comparison against aircraft
              weight is made here.
            </p>
          </>
        ) : (
          <NotPublished what="No weight-bearing capacity published" />
        )}
      </div>
    </div>
  );
}

export default function AirportReferenceDetail({
  airport,
  onBack,
  onSubmitCorrection,
}: AirportReferenceDetailProps) {
  const attended = airport.attendance
    .map((slot) => `${slot.month}/${slot.day} ${slot.hour}`)
    .join(', ');

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

      <Card className="border-dashed p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Company page</h2>
          <ProvenanceChip source="company" />
        </div>
        <p className="text-sm text-muted-foreground">
          PPR, curfews, operations notes, FBO preference and handling limits are authored by the
          flight department rather than published by any vendor. No vendor supplies them, so this
          layer is the one that has to be written by hand.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {onSubmitCorrection
            ? 'Nothing has been published for this airport yet.'
            : 'Nothing has been published for this airport yet, and the propose → review → publish workflow is not wired up in this build — the editing screens still run on demo data.'}
        </p>
      </Card>
    </div>
  );
}
