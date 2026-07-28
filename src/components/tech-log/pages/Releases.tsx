import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserCheck, Printer } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import type { MaintenanceRelease } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { RectifyPanel } from '../components/panels/RectifyPanel';
import { GatingReleasePanel } from '../components/panels/GatingReleasePanel';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

export default function Releases() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useTechLog();

  const deferralId = params.get('deferral') ?? undefined;
  const isGating = params.get('gating') === '1' && !!deferralId;
  const defectId = params.get('defect') ?? undefined;

  const deferral = deferralId ? currentRows(state.deferrals).find(d => d.id === deferralId) : undefined;
  const rectifyDefect = defectId ? currentRows(state.defects).find(d => d.id === defectId) : undefined;
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  // ===== GATING-DISCHARGE MODE (deep-link) =====
  if (isGating && deferral) {
    const aircraft = state.aircraft.find(a => a.id === deferral.aircraftId);
    // TL-16: MEL identity frozen on the signed deferral (D36), not a live MelItem join.
    return (
      <TechLogShell title={`(M)/Placard Release — ${aircraft?.tailNumber ?? ''}`} subtitle={`MEL ${deferral.melSubItemNumber ?? 'not recorded'} · ${deferral.melTitle ?? ''}`}>
        <div className="max-w-2xl">
          <GatingReleasePanel
            deferral={deferral}
            onCancel={() => navigate('/tech-log/deferrals')}
            onDone={() => navigate(`/tech-log/aircraft/${aircraft?.tailNumber}`)}
          />
        </div>
      </TechLogShell>
    );
  }

  // ===== CRS RECTIFY MODE (deep-link) =====
  if (rectifyDefect) {
    const aircraft = state.aircraft.find(a => a.id === rectifyDefect.aircraftId);
    return (
      <TechLogShell title={`Return to Service — ${aircraft?.tailNumber ?? ''}`} subtitle={`ATA ${rectifyDefect.ataChapter} · ${rectifyDefect.description}`}>
        <div className="max-w-2xl">
          <RectifyPanel
            defect={rectifyDefect}
            onCancel={() => navigate('/tech-log/defects')}
            onDone={() => navigate(`/tech-log/aircraft/${aircraft?.tailNumber}`)}
          />
        </div>
      </TechLogShell>
    );
  }

  // ===== LIST / HISTORY MODE =====
  const releases = currentRows(state.releases).slice().reverse();
  const acOf = (id: string) => state.aircraft.find(a => a.id === id);
  const sigById = (id?: string) => (id ? state.signatures.find(s => s.id === id) : undefined);

  const printRelease = (r: MaintenanceRelease) => {
    const ac = acOf(r.aircraftId);
    const perf = sigById(r.signatureId);
    const rii = sigById(r.riiSignatureId);
    const sigs = [perf, rii].filter(Boolean).map(s => ({ role: s!.signerRole, name: s!.signerName, cert: s!.certNumber, hash: s!.contentHashShort, signedAtUtc: s!.signedAtUtc, amr: s!.amr.join('+') }));
    printSignedRecord({
      docTitle: r.signoffType === 'DEFERRAL' ? '(M) / Placard Discharge Release' : 'Certificate of Release to Service',
      recordType: r.isGatingDischarge ? 'Gating discharge' : r.signoffType,
      reference: r.id,
      aircraft: ac ? `${ac.tailNumber} · ${ac.type} · S/N ${ac.serialNumber}` : undefined,
      pdfBlobUri: r.pdfBlobUri ?? mockPdfBlobUri('crs', r.id),
      sections: [
        { heading: 'Work performed (14 CFR 91.417(a)(1)(i))', body: r.workDescription },
        { heading: 'Return to service', fields: [
          { label: 'Completed', value: new Date(r.completionDateUtc).toLocaleString() },
          // TL-16 / DM-3: read the name frozen into the Signature this release was signed with.
          // These were live Personnel joins while `perf.signerName` — already fetched two lines
          // above for the signature block — sat unused, so one printed CRS could show two
          // different names for the same person, beside a cert number that WAS frozen.
          { label: 'Certifying tech', value: perf?.signerName ?? 'not recorded' },
          { label: 'A&P / IA cert', value: r.apCertificateNumber || '—' },
          { label: 'RII required', value: r.riiRequired ? 'Yes' : 'No' },
          ...(r.riiInspectorOid ? [{ label: 'RII inspector', value: rii?.signerName ?? 'not recorded' }] : []),
        ], body: r.returnToServiceStatement },
      ],
      signatures: sigs,
    });
  };

  return (
    <TechLogShell title="Maintenance Releases" subtitle="Signed CRS, rectifications, and (M)/placard discharges.">
      <div className="space-y-3">
        {releases.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No releases yet. Rectify a defect or discharge a deferral from an aircraft's workspace.</CardContent></Card>}
        {releases.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{tailOf(r.aircraftId)}</span>
                <Badge variant="outline">{r.signoffType}</Badge>
                {r.isGatingDischarge && <Badge variant="secondary">gating discharge</Badge>}
                {r.riiRequired && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.completionDateUtc).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{r.workDescription}</p>
              <div className="mt-0.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">A&P {r.apCertificateNumber || '—'}</p>
                <Button size="sm" variant="ghost" onClick={() => printRelease(r)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TechLogShell>
  );
}
