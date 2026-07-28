import { useTechLog } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { CFR_MATRIX } from '../constants';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { History, FileSignature, Database, Lock, Scale, ShieldAlert } from 'lucide-react';

export default function AuditTrail() {
  const { state } = useTechLog();
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;

  const ledgerRows = [
    ...state.defects.map(d => ({ kind: 'Defect', id: d.id, label: `ATA ${d.ataChapter} · ${d.status}`, supersedesId: d.supersedesId, hash: state.signatures.find(s => s.id === d.signatureId)?.contentHashShort })),
    ...state.deferrals.map(d => ({ kind: 'Deferral', id: d.id, label: `Cat ${d.category} · ${d.status}`, supersedesId: d.supersedesId, hash: state.signatures.find(s => s.id === d.signatureId)?.contentHashShort })),
    ...state.releases.map(r => ({ kind: 'Release', id: r.id, label: r.signoffType, supersedesId: r.supersedesId, hash: state.signatures.find(s => s.id === r.signatureId)?.contentHashShort })),
    ...state.flightLogs.map(f => ({ kind: 'FlightLog', id: f.id, label: `sector ${f.sectorSequence}`, supersedesId: f.supersedesId, hash: state.signatures.find(s => s.id === f.signatureId)?.contentHashShort })),
  ];
  const supersededIds = new Set(ledgerRows.map(r => r.supersedesId).filter(Boolean) as string[]);
  const supersededCount = supersededIds.size;

  return (
    <TechLogShell title="Audit &amp; Ledger" subtitle="Tamper-evident record (simulated). Append-only — corrections supersede, never overwrite.">
      <Card className="mb-4">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" />
          Append-only: {ledgerRows.length} signed rows, {supersededCount} superseded (retained, not deleted). In production these are Azure SQL ledger tables with a Merkle digest to immutable Blob WORM.
        </CardContent>
      </Card>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity"><History className="mr-1.5 h-4 w-4" /> Activity</TabsTrigger>
          <TabsTrigger value="signatures"><FileSignature className="mr-1.5 h-4 w-4" /> Signatures</TabsTrigger>
          <TabsTrigger value="ledger"><Database className="mr-1.5 h-4 w-4" /> Ledger</TabsTrigger>
          <TabsTrigger value="compliance"><Scale className="mr-1.5 h-4 w-4" /> Compliance</TabsTrigger>
          <TabsTrigger value="conflicts">
            <ShieldAlert className="mr-1.5 h-4 w-4" /> Conflicts
            {state.supersedeConflicts.length > 0 && <Badge variant="destructive" className="ml-1.5">{state.supersedeConflicts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card><CardContent className="space-y-1 p-4 text-sm">
            {state.audit.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
            {state.audit.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                <div><Badge variant="outline" className="mr-2">{a.action}</Badge><span className="text-muted-foreground">{a.summary}</span></div>
                <span className="shrink-0 text-xs text-muted-foreground">{nameOf(a.actorOid)} · {new Date(a.atUtc).toLocaleString()}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="signatures">
          <Card><CardContent className="space-y-1 p-4 text-sm">
            {state.signatures.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                <div><Badge variant="outline" className="mr-2">{s.signedEntity}</Badge>{s.signerName} <span className="text-xs text-muted-foreground">· {s.amr.join('+')}</span></div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.contentHashShort} · {new Date(s.signedAtUtc).toLocaleString()}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card><CardContent className="space-y-1 p-4 text-sm">
            {ledgerRows.map(r => {
              const superseded = supersededIds.has(r.id);
              return (
                <div key={r.id} className={`flex items-center justify-between gap-3 border-b py-1.5 last:border-0 ${superseded ? 'opacity-50' : ''}`}>
                  <div><Badge variant="outline" className="mr-2">{r.kind}</Badge>{r.label}{r.supersedesId && <span className="ml-2 text-xs text-muted-foreground">(correction)</span>}{superseded && <Badge variant="outline" className="ml-2">superseded</Badge>}</div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.hash ?? '—'}</span>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card><CardContent className="space-y-1 p-4 text-sm">
            <p className="mb-2 text-xs text-muted-foreground">Function → regulation traceability (see docs/COMPLIANCE_TRACEABILITY.md). Confirm citations with the DOM against final AC revisions.</p>
            {CFR_MATRIX.map((r, i) => (
              <div key={i} className="flex flex-col gap-0.5 border-b py-1.5 last:border-0 md:flex-row md:justify-between md:gap-3">
                <span className="font-medium">{r.capability}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.reg}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <Card><CardContent className="space-y-1 p-4 text-sm">
            <p className="mb-2 text-xs text-muted-foreground">
              Rejected forked corrections — two superseding rows attempted against the same parent record. The append-only ledger never silently double-counts; these are held here for a human to reconcile (CLAUDE.md DM-2).
            </p>
            {state.supersedeConflicts.length === 0 && <p className="text-muted-foreground">No conflicts.</p>}
            {state.supersedeConflicts.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                <div>
                  <Badge variant="destructive" className="mr-2">{c.entityType}</Badge>
                  Rejected correction <span className="font-mono text-xs">{c.attemptedRowId}</span> — parent <span className="font-mono text-xs">{c.supersedesId}</span> already superseded
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{nameOf(c.rejectedActorOid)} · {new Date(c.rejectedAtUtc).toLocaleString()}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </TechLogShell>
  );
}
