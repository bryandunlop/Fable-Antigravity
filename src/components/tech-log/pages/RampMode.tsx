/**
 * Ramp mode — what a pilot turns the iPad around and shows an FAA inspector (D36).
 *
 * Deliberately NOT wrapped in TechLogShell. The shell's navigation is the whole problem: an
 * unlocked device scrolls into other tails, unrelated open defects, and analytics — material
 * nobody asked for. AOPA advises against volunteering digital content to an inspector, so the
 * lockdown is the feature, not a limitation. One tail, one question, one way out.
 *
 * The layout order is not a design preference — it is FAA Order 8900.1 ¶6-101F5 read top to
 * bottom: N-number and serial, then LOA, then deferred items with placards and dates.
 *
 * Every deferral field here comes from `buildRampView`, which cannot see MelItem or Personnel.
 * Signer identity is read from the frozen Signature row. Nothing on this screen resolves
 * through a live foreign key.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ShieldCheck, AlertTriangle, MapPin, Printer, FileWarning } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { buildRampView, type RampDeferralRow } from '../engine/rampCheck';
import { formatRegulatoryCompact } from '../util/displayZone';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';

const CATEGORY_DAYS_LABEL: Record<string, string> = {
  A: 'per proviso', B: '3 calendar days', C: '10 calendar days', D: '120 calendar days',
};

export default function RampMode() {
  const { tail } = useParams();
  const navigate = useNavigate();
  const { state } = useTechLog();
  const [openId, setOpenId] = useState<string | null>(null);

  const ac = state.aircraft.find(a => a.tailNumber === tail);

  // asOf is captured once per mount rather than ticking: an inspector is reading a fixed moment,
  // and a row silently flipping to EXPIRED mid-conversation would be worse than useless.
  const view = useMemo(
    () => (ac ? buildRampView(ac.id, { aircraft: state.aircraft, deferrals: state.deferrals }, new Date().toISOString()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ac?.id, state.aircraft, state.deferrals],
  );

  if (!ac || !view) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">No aircraft matches {tail}.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/tech-log/fleet')}>Back to fleet</Button>
      </div>
    );
  }

  const sigFor = (id: string) => state.signatures.find(s => s.id === id);

  const printRow = (r: RampDeferralRow) => {
    const sig = sigFor(r.signatureId);
    printSignedRecord({
      docTitle: 'MEL deferral record',
      recordType: 'Deferral',
      reference: r.deferralId,
      aircraft: `${view.tailNumber} · S/N ${view.serialNumber}`,
      sections: [
        {
          heading: 'Deferred item',
          fields: [
            { label: 'MEL item', value: r.melSubItemNumber ?? 'not recorded' },
            { label: 'Description', value: r.melTitle ?? 'not recorded' },
            { label: 'Category', value: `${r.category} — ${CATEGORY_DAYS_LABEL[r.category] ?? ''}` },
            { label: 'Governing MMEL', value: `Rev ${r.governingMmelRevision} · eff ${r.governingEffectiveDate}` },
            { label: 'Status', value: r.status },
          ],
        },
        {
          heading: 'Placard',
          fields: [
            { label: 'Required', value: r.placardRequired ? 'Yes' : 'No' },
            { label: 'Installed', value: r.placardInstalled ? 'Yes' : 'No' },
            { label: 'Location', value: r.placardLocation ?? '—' },
          ],
        },
        {
          heading: 'Repair interval',
          fields: [
            { label: 'Clock start', value: formatRegulatoryCompact(r.clockStartDateUtc, 'GOVERNING', r.governingTimezone) },
            { label: 'Due', value: r.repairDueDateUtc ? formatRegulatoryCompact(r.repairDueDateUtc, 'GOVERNING', r.governingTimezone) : `${r.usageDueThreshold ?? '—'} ${r.repairIntervalUnit}` },
            { label: 'Governing timezone', value: r.governingTimezone },
          ],
        },
        ...(r.restrictionText ? [{ heading: 'Restriction', body: r.restrictionText }] : []),
      ],
      signatures: sig
        ? [{ role: sig.signerRole, name: sig.signerName, cert: sig.certNumber, hash: sig.mockContentHash, signedAtUtc: sig.signedAtUtc, amr: sig.amr.join('+') }]
        : [],
      pdfBlobUri: mockPdfBlobUri('deferral', r.deferralId),
      footnote: 'Presented under 14 CFR 91.213(a). Governing MMEL revision and MEL identity are frozen as signed.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
        view.hasFinding ? 'bg-[var(--gfo-error,#EF3340)]/10 text-[var(--gfo-error,#EF3340)]' : 'bg-muted',
      )}>
        <span className="flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4" />
          Ramp presentation · read only
        </span>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/tech-log/aircraft/${view.tailNumber}`)}>
          Exit <X className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">{view.tailNumber}</h1>
            <p className="text-sm text-muted-foreground">Gulfstream {view.type} · S/N {view.serialNumber}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Minimum equipment list</p>
              <p className="text-sm font-medium">D195 · {view.type}</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Letter of authorization</p>
              {view.loaHeld ? (
                <p className="text-sm font-medium">On file</p>
              ) : (
                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--gfo-error,#EF3340)]">
                  <FileWarning className="h-3.5 w-3.5" /> Not held in myGFO
                </p>
              )}
            </div>
          </div>
          {!view.loaHeld && (
            <p className="text-xs text-muted-foreground">
              The MEL documents and LOA are not carried in myGFO yet (TL-25). Refer to the aircraft's carried copy.
            </p>
          )}
        </header>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Deferred items · {view.deferrals.length}</h2>
            {view.hasFinding && (
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--gfo-error,#EF3340)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Not dispatchable
              </span>
            )}
          </div>

          {view.deferrals.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No deferred items. No inoperative equipment is carried under the MEL.
            </p>
          ) : (
            view.deferrals.map(r => (
              <RampRow
                key={r.deferralId}
                row={r}
                open={openId === r.deferralId}
                onToggle={() => setOpenId(openId === r.deferralId ? null : r.deferralId)}
                signature={sigFor(r.signatureId)}
                onPrint={() => printRow(r)}
              />
            ))
          )}
        </section>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Read from the signed record as at {formatRegulatoryCompact(view.computedAtUtc, 'UTC', 'UTC')}. Available offline.
        </p>
      </div>
    </div>
  );
}

function RampRow({
  row, open, onToggle, signature, onPrint,
}: {
  row: RampDeferralRow;
  open: boolean;
  onToggle: () => void;
  signature?: { signerName: string; signerRole: string; certNumber?: string; signedAtUtc: string; mockContentHash: string; amr: string[] };
  onPrint: () => void;
}) {
  const bad = row.status !== 'ACTIVE';
  const due = row.repairDueDateUtc
    ? formatRegulatoryCompact(row.repairDueDateUtc, 'GOVERNING', row.governingTimezone)
    : row.usageDueThreshold != null
      ? `${row.usageDueThreshold} ${row.repairIntervalUnit.toLowerCase()}s`
      : '—';

  return (
    <div className={cn('rounded-lg border', bad && 'border-[var(--gfo-error,#EF3340)]/50')}>
      <button type="button" onClick={onToggle} className="w-full px-3 py-3 text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <span className="font-medium">{row.melSubItemNumber ?? 'MEL item not recorded'}</span>
            <span className="text-sm text-muted-foreground">{row.melTitle ?? ''}</span>
          </span>
          <Badge variant={bad ? 'destructive' : 'outline'}>
            Cat {row.category} · {row.status.replace('_', ' ').toLowerCase()}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {row.placardRequired ? (
            <span className={cn('flex items-center gap-1', row.placardInstalled ? 'text-muted-foreground' : 'text-[var(--gfo-error,#EF3340)]')}>
              <MapPin className="h-3 w-3" />
              {row.placardInstalled ? 'Placard' : 'Placard NOT installed'}
              {row.placardLocation ? ` — ${row.placardLocation}` : ''}
            </span>
          ) : (
            <span className="text-muted-foreground">No placard required</span>
          )}
          <span className={cn('text-muted-foreground', row.isExpired && 'font-medium text-[var(--gfo-error,#EF3340)]')}>
            Deferred {formatRegulatoryCompact(row.clockStartDateUtc, 'GOVERNING', row.governingTimezone)} · due {due}
            {row.isExpired ? ' — EXPIRED' : ''}
          </span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 py-3 text-xs">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Governing MMEL" value={`Rev ${row.governingMmelRevision} · eff ${row.governingEffectiveDate}`} />
            <Field label="Repair interval" value={CATEGORY_DAYS_LABEL[row.category] ?? '—'} />
            <Field label="Regulatory clock zone" value={row.governingTimezone} />
            <Field label="Extension used" value={row.status === 'EXPIRED' ? 'see record' : '—'} />
          </div>

          {row.restrictionText && <Field label="Restriction" value={row.restrictionText} />}

          <div className="rounded-md bg-muted/60 p-2.5">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Electronic signature — AC 120-78B</p>
            {signature ? (
              <>
                <p className="font-medium">
                  {signature.signerName} · {signature.signerRole}
                  {signature.certNumber ? ` · A&P ${signature.certNumber}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {formatRegulatoryCompact(signature.signedAtUtc, 'UTC', 'UTC')} · {signature.amr.join('+')}
                </p>
                <p className="font-mono text-muted-foreground">{signature.mockContentHash}</p>
              </>
            ) : (
              <p className="text-[var(--gfo-error,#EF3340)]">Signature record not found.</p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print this record
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
