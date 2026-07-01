import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Separator } from '../ui/separator';
import { FileText, Send, Eye, Plane } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import {
  FakeMyAirOpsClient, FakeForeFlightDispatchClient, ForeFlightSyncService,
  renderTripSheetHtml,
} from '../../scheduling/foreflight';
import type { SyncReport, PushItemStatus, ForeFlightFileRecord } from '../../scheduling/foreflight';
import type { TripRecord } from '../../scheduling/store';

function statusBadgeClassName(status: PushItemStatus): string {
  switch (status) {
    case 'uploaded':
    case 'replaced':
    case 'unchanged':
      return 'status-success';
    case 'no_matching_flight':
      return 'status-warning';
    case 'error':
    default:
      return 'status-error';
  }
}

function statusLabel(status: PushItemStatus): string {
  switch (status) {
    case 'uploaded': return 'Uploaded';
    case 'replaced': return 'Replaced';
    case 'unchanged': return 'Unchanged';
    case 'no_matching_flight': return 'No flight yet';
    case 'error': return 'Error';
    default: return status;
  }
}

export default function ForeFlightPanel() {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [filesByLeg, setFilesByLeg] = useState<Record<string, ForeFlightFileRecord[]>>({});
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Fake external systems, kept alive for the life of this panel so repeated pushes
  // against the same trip correctly demo "uploaded" -> "unchanged" -> "replaced".
  const [myAirOps] = useState(() => new FakeMyAirOpsClient());
  const [foreFlight] = useState(() => new FakeForeFlightDispatchClient());
  const [syncService] = useState(() => new ForeFlightSyncService({ myAirOps, foreFlight }));

  useEffect(() => {
    store.listTrips().then(setTrips);
  }, [store, tick]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  async function refreshDeliveredFiles(trip: TripRecord) {
    setFilesByLeg(await syncService.listDeliveredFiles(trip));
  }

  async function handlePreview() {
    if (!selectedTrip) return;
    const sheet = await myAirOps.getTripSheet(selectedTrip);
    setPreviewHtml(renderTripSheetHtml(sheet));
  }

  async function handlePush() {
    if (!selectedTrip) return;
    setPushing(true);
    try {
      const result = await syncService.pushTripDocuments(selectedTrip, nowUtc());
      setReport(result);
      await refreshDeliveredFiles(selectedTrip);
      if (result.failed > 0) {
        toast.warning(`Pushed with ${result.failed} issue(s) — see details below.`);
      } else {
        toast.success(`Pushed ${result.successful} document(s) to ForeFlight.`);
      }
    } catch (err) {
      toast.error(`Push failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Push Trip Documents to ForeFlight
          </CardTitle>
          <CardDescription>
            Pulls the trip sheet from myairops (crew, FBOs, leg notes, passenger roster) and myGFO's own
            passenger travel documents, then delivers both into the Files tab of the matching ForeFlight
            flight. myairops stays the source of truth — myGFO only integrates and delivers.
            <br />
            <span className="text-xs">
              Demo build: ForeFlight and myairops are both faked here with realistic response shapes —
              nothing calls the real APIs.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trips yet — create one in the Trips tab first, then come back here to push its documents.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedTripId ?? undefined} onValueChange={(v: string) => { setSelectedTripId(v); setReport(null); }}>
                  <SelectTrigger className="w-[320px]">
                    <SelectValue placeholder="Select a trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.tripNumber} — {t.tail} ({t.legs.length} leg{t.legs.length === 1 ? '' : 's'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handlePreview} disabled={!selectedTrip}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Trip Sheet
                </Button>

                <Button onClick={handlePush} disabled={!selectedTrip || pushing}>
                  <Send className="w-4 h-4 mr-2" />
                  {pushing ? 'Pushing…' : 'Push to ForeFlight'}
                </Button>
              </div>

              {selectedTrip && (
                <p className="text-sm text-muted-foreground">
                  {selectedTrip.tripNumber} · {selectedTrip.tail} · {selectedTrip.aircraftType} ·{' '}
                  {selectedTrip.legs.map((l) => `${l.departureIcao}-${l.arrivalIcao}`).join(', ')}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Report</CardTitle>
            <CardDescription>{new Date(report.timestampUtc).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold">{report.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold">{report.successful}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold">{report.updated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold">{report.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leg</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.details.map((d, i) => (
                  <TableRow key={`${d.legId}-${d.displayName}-${i}`}>
                    <TableCell>{d.route}</TableCell>
                    <TableCell>{d.displayName}</TableCell>
                    <TableCell>
                      <span className={`status-badge ${statusBadgeClassName(d.status)}`}>{statusLabel(d.status)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.message ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedTrip && Object.values(filesByLeg).some((f) => f.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Delivered to ForeFlight</CardTitle>
            <CardDescription>What's currently in the Files tab for each leg's flight.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTrip.legs.map((leg) => {
              const files = filesByLeg[leg.id] ?? [];
              if (files.length === 0) return null;
              return (
                <div key={leg.id}>
                  <div className="text-sm font-medium mb-2">{leg.departureIcao} → {leg.arrivalIcao}</div>
                  <ul className="space-y-1">
                    {files.map((f) => (
                      <li key={f.objectId} className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {f.displayName}
                        </a>
                        <span className="text-xs text-muted-foreground">({f.category})</span>
                      </li>
                    ))}
                  </ul>
                  <Separator className="mt-3" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={previewHtml !== null} onOpenChange={(open) => { if (!open) setPreviewHtml(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Trip Sheet Preview</DialogTitle>
            <DialogDescription>Rendered by myGFO from the (faked) myairops trip-sheet pull.</DialogDescription>
          </DialogHeader>
          {previewHtml && (
            <iframe title="Trip sheet preview" srcDoc={previewHtml} className="w-full flex-1 border rounded-md bg-white" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
