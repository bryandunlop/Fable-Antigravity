import { useMemo, useState } from 'react';
import { BookOpen, Search, Info, CalendarClock } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { CATEGORY_DAYS } from '../constants';
import type { AircraftType, MelItem } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

/**
 * Read-only MEL browser (§7 GET /mel). Browse the *effective* MEL for a type as-of a date:
 * only APPROVED items whose effectiveDate is on/before the as-of date. Distinct from Admin (no edit)
 * and from the deferral picker (no sign action) — a pure reference view.
 */
export default function MelBrowser() {
  const { state } = useTechLog();
  const [type, setType] = useState<AircraftType>('G500');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<MelItem | null>(null);

  const effective = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.melItems
      .filter(m => m.aircraftType === type)
      .filter(m => m.approvalState === 'APPROVED')
      .filter(m => m.effectiveDate <= asOf)
      .filter(m => !query || m.subItemNumber.toLowerCase().includes(query) || m.title.toLowerCase().includes(query) || m.ataReference === query)
      .sort((a, b) => a.subItemNumber.localeCompare(b.subItemNumber));
  }, [state.melItems, type, asOf, q]);

  const totalApproved = state.melItems.filter(m => m.aircraftType === type && m.approvalState === 'APPROVED').length;
  const pendingType = state.melItems.some(m => m.aircraftType === type && m.approvalState !== 'APPROVED' && m.approvalState !== 'SUPERSEDED');

  return (
    <TechLogShell
      title="MEL Browser"
      subtitle="Point-in-time view of the effective Minimum Equipment List — reference only."
      actions={
        <div className="flex items-center gap-2">
          <div>
            <Label className="sr-only">Type</Label>
            <Select value={type} onValueChange={(v: string) => { setType(v as AircraftType); setSelected(null); }}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{(['G500', 'G650ER', 'G800'] as AircraftType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="h-9 w-[150px]" value={asOf} onChange={e => setAsOf(e.target.value)} title="Effective as-of date" />
          </div>
        </div>
      }
    >
      {pendingType && (
        <Card className="mb-3 border-muted-foreground/30">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4" />
            Some {type} MEL content is not yet APPROVED (provisional / pending FSDO) and is therefore excluded from the effective list below.
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search effective ${type} MEL…`} value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
        <span className="text-xs text-muted-foreground">{effective.length} effective of {totalApproved} approved · as-of {asOf}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          {effective.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent/40 ${selected?.id === m.id ? 'border-primary bg-accent/40' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{m.subItemNumber}</span>
                <Badge variant="outline">Cat {m.category}</Badge>
                <Badge variant="outline">{CATEGORY_DAYS[m.category] ? `${CATEGORY_DAYS[m.category]}d` : 'proviso'}</Badge>
                {m.oProcedure && <Badge variant="outline">(O)</Badge>}
                {m.mProcedure && <Badge variant="outline">(M)</Badge>}
                {m.placardText || m.placardLocation ? <Badge variant="outline">placard</Badge> : null}
              </div>
              <div className="mt-0.5 truncate text-muted-foreground">{m.title}</div>
            </button>
          ))}
          {effective.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No effective {type} MEL items match for {asOf}.</CardContent></Card>}
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardContent className="p-4 text-sm">
            {!selected && <p className="text-muted-foreground">Select an item to view its category, provisos, (O)/(M) procedures, and placard.</p>}
            {selected && (
              <div className="space-y-3">
                <div>
                  <div className="text-base font-semibold">{selected.subItemNumber} — {selected.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline">ATA {selected.ataReference}</Badge>
                    <Badge variant="outline">Cat {selected.category}</Badge>
                    <Badge variant="outline">{CATEGORY_DAYS[selected.category] ? `${CATEGORY_DAYS[selected.category]}-day clock` : 'per proviso'}</Badge>
                    {selected.numberInstalled != null && <Badge variant="outline">{selected.numberRequired}/{selected.numberInstalled} req/inst</Badge>}
                    {selected.flightCrewDeferral ? <Badge variant="outline">FC-deferrable</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{selected.mmelRevision} · effective {selected.effectiveDate}</div>
                </div>
                {selected.provisos && (
                  <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provisos</div><p className="mt-0.5 whitespace-pre-wrap text-sm">{selected.provisos}</p></div>
                )}
                {selected.oProcedure && (
                  <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">(O) Operational procedure</div><p className="mt-0.5 whitespace-pre-wrap text-sm">{selected.oProcedure}</p></div>
                )}
                {selected.mProcedure && (
                  <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">(M) Maintenance procedure</div><p className="mt-0.5 whitespace-pre-wrap text-sm">{selected.mProcedure}</p></div>
                )}
                {(selected.placardText || selected.placardLocation) && (
                  <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placard</div><p className="mt-0.5 text-sm">{selected.placardText ?? '—'}{selected.placardLocation ? ` (${selected.placardLocation})` : ''}</p></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TechLogShell>
  );
}
