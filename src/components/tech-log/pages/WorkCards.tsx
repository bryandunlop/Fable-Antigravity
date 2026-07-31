import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList, Download, CheckCircle2, Clock, UserCheck, CloudDownload, CalendarClock, Plane } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { WO_HEADER_STATUS } from '../integration/campTaxonomy';
import { newId } from '../util/id';
import { formatReferences } from '../engine/workCardReferences';
import type { WorkCard } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const STATUS_VARIANT: Record<WorkCard['status'], 'destructive' | 'secondary' | 'outline'> = {
  OPEN: 'destructive', IN_WORK: 'secondary', COMPLETED: 'outline',
};

export default function WorkCards() {
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const isMaint = user.role === 'MAINTENANCE';

  const [pullOpen, setPullOpen] = useState(false);
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const [tail, setTail] = useState(dispatchable[0]?.tailNumber ?? '');
  const [woNumber, setWoNumber] = useState('');
  const [woOptions, setWoOptions] = useState<{ woNumber: string; title: string; ata: string; scheduled: boolean; riiRequired: boolean }[]>([]);

  const aircraftByTail = (t: string) => state.aircraft.find(a => a.id && a.tailNumber === t);

  // Load open CAMP work orders when the pull dialog opens or the aircraft changes (effect — never during render).
  useEffect(() => {
    if (!pullOpen) return;
    const ac = aircraftByTail(tail);
    setWoOptions(ac ? integration.listWorkOrders(ac.id) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullOpen, tail]);

  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';
  // Grouped by tail, open work first — the list answers "what's on each aircraft" at a glance.
  const grouped = state.aircraft
    .map(a => ({
      aircraft: a,
      cards: state.workCards
        .filter(w => w.aircraftId === a.id)
        .sort((x, y) => (x.status === 'COMPLETED' ? 1 : 0) - (y.status === 'COMPLETED' ? 1 : 0) || y.createdAtUtc.localeCompare(x.createdAtUtc)),
    }))
    .filter(g => g.cards.length > 0)
    .sort((a, b) => a.aircraft.tailNumber.localeCompare(b.aircraft.tailNumber));
  const laborOf = (cardId: string) => Math.round(state.laborEntries.filter(l => l.workCardId === cardId).reduce((s, l) => s + l.hours, 0) * 10) / 10;
  const dueOf = (w: WorkCard) => (w.forecastRef ? integration.readForecast(w.aircraftId).find(f => f.ref === w.forecastRef) : undefined);

  const pull = () => {
    const ac = aircraftByTail(tail);
    if (!ac || !woNumber) return toast.error('Select an aircraft and a work order.');
    if (state.workCards.some(w => w.woNumber === woNumber && w.aircraftId === ac.id && w.status !== 'COMPLETED')) {
      return toast.error('That work order is already open as a card.');
    }
    const wo = integration.pullWorkOrder(ac.id, woNumber);
    if (!wo) return toast.error('CAMP returned no detail for that work order.');
    const id = newId('wc');
    const now = new Date().toISOString();
    const card: WorkCard = {
      id, cardNumber: `WC-${id.slice(-4).toUpperCase()}`, woNumber: wo.woNumber, aircraftId: ac.id,
      title: wo.title, ataChapter: wo.ata,
      description: wo.lines.filter(l => l.lineType === 'S').map(l => l.description).join('; ') || wo.title,
      source: 'CAMP', headerStatusCode: wo.headerStatusCode, scheduled: wo.scheduled, riiRequired: wo.riiRequired,
      createdAtUtc: now, status: 'OPEN',
    };
    dispatch({ type: 'ADD_WORK_CARD', payload: card });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_PULLED', entityType: 'WorkCard', entityId: id, atUtc: now, summary: `Pulled ${wo.woNumber} from CAMP → ${card.cardNumber} (${ac.tailNumber})` } });
    setPullOpen(false);
    setWoNumber('');
    toast.success(`Pulled ${wo.woNumber} — ${card.cardNumber} ready to execute.`);
    navigate(`/tech-log/work-cards/${id}`);
  };

  return (
    <TechLogShell
      title="Work Cards"
      subtitle="Pull a CAMP work order, perform it, capture parts & labor, and sign completion (RTS)."
      actions={isMaint ? <Button size="sm" onClick={() => setPullOpen(true)}><CloudDownload className="mr-1.5 h-4 w-4" /> Pull from CAMP</Button> : undefined}
    >
      <div className="space-y-5">
        {state.workCards.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No work cards yet. {isMaint ? 'Pull a work order from CAMP to begin.' : 'Maintenance pulls work orders from CAMP.'}</CardContent></Card>
        )}
        {grouped.map(({ aircraft, cards }) => (
          <div key={aircraft.id} className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{aircraft.tailNumber}</span>
              <span className="text-muted-foreground">{aircraft.type}</span>
              <Badge variant="outline">{cards.filter(w => w.status !== 'COMPLETED').length} open · {cards.length} total</Badge>
            </div>
            {cards.map(w => {
              const labor = laborOf(w.id);
              const due = dueOf(w);
              const dueDays = due?.dueDateUtc ? Math.floor((new Date(due.dueDateUtc).getTime() - Date.now()) / 86400000) : null;
              const dueSoon = dueDays != null && dueDays <= 7;
              return (
                <Card key={w.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{w.cardNumber}</span>
                        <Badge variant="outline">ATA {w.ataChapter}</Badge>
                        <Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge>
                        {w.scheduled ? <Badge variant="outline">scheduled</Badge> : <Badge variant="outline">corrective</Badge>}
                        {w.riiRequired && <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" />RII</Badge>}
                        {due && w.status !== 'COMPLETED' && (
                          <Badge variant="outline" className={dueSoon ? 'border-[var(--gfo-warning,#F1B434)] text-[var(--gfo-warning,#F1B434)]' : ''}>
                            <CalendarClock className="mr-1 h-3 w-3" />
                            {due.dueDateUtc ? `due ${new Date(due.dueDateUtc).toLocaleDateString()}${dueDays != null ? ` · ${dueDays < 0 ? `overdue ${Math.abs(dueDays)}d` : `${dueDays}d`}` : ''}` : 'CAMP due list'}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{w.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {w.woNumber ? `CAMP ${w.woNumber} · ` : ''}WO status: {WO_HEADER_STATUS[w.headerStatusCode] ?? w.headerStatusCode}
                        {labor > 0 ? ` · ${labor} h logged` : ''}
                        {/* D68: the references on the row itself, so "which procedure is this card
                            working to" is answerable without opening every card. */}
                        {formatReferences(w) ? ` · ${formatReferences(w)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {w.status === 'COMPLETED'
                        ? <span className="inline-flex items-center gap-1 text-[var(--gfo-success,#00B140)]"><CheckCircle2 className="h-3.5 w-3.5" /> Complied with</span>
                        : <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> opened {new Date(w.createdAtUtc).toLocaleDateString()}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Pull work order from CAMP</DialogTitle>
            <DialogDescription>Mock GetWODetails (sandbox). The task lines become an executable work card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Aircraft</Label>
              <Select value={tail} onValueChange={(v: string) => { setTail(v); setWoNumber(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Open work order</Label>
              <Select value={woNumber} onValueChange={(v: string) => setWoNumber(v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a CAMP work order" /></SelectTrigger>
                <SelectContent>
                  {woOptions.map(w => <SelectItem key={w.woNumber} value={w.woNumber}>{w.woNumber} · {w.title}{w.riiRequired ? ' (RII)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullOpen(false)}>Cancel</Button>
            <Button onClick={pull}>Pull &amp; open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
