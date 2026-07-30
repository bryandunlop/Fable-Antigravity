import { useState } from 'react';
import { toast } from 'sonner';
import { PackageCheck, PackageSearch, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import type { PartsOrder, WorkCard } from '../types';
import { partsLeadTimes } from '../engine/metrics';
import { newId } from '../util/id';

/** The vendor most orders go to. A default in the input, never in the type — the field is free
 * text because the shop also orders from Duncan, Satcom Direct, a rotable pool, whoever has it. */
const DEFAULT_VENDOR = 'Gulfstream';

interface Props {
  card: WorkCard;
  canEdit: boolean;
  onSave: (card: WorkCard) => void;
  /** Offered, never forced (LG-100): raising an order may tag the card WAITING_PARTS. */
  onOfferWaitingParts: (order: PartsOrder) => void;
  waitingPartsAlready: boolean;
}

/**
 * Parts on order against this card — "how long does Gulfstream take to send parts" (LG-100).
 *
 * Existing cards record ordering as prose in the `WAITING_PARTS` note ("what part, ordered from
 * whom"). Those notes are deliberately NOT migrated into this structure: a sentence is not
 * reliably parseable into a vendor and a part number, and guessing would invent procurement facts
 * on records people rely on. Both live side by side; new orders go here.
 */
export function PartsOrdersPanel({ card, canEdit, onSave, onOfferWaitingParts, waitingPartsAlready }: Props) {
  const [desc, setDesc] = useState('');
  const [pn, setPn] = useState('');
  const [vendor, setVendor] = useState(DEFAULT_VENDOR);
  const [note, setNote] = useState('');

  const orders = card.partsOrders ?? [];
  const leads = partsLeadTimes(card, new Date().toISOString());
  const leadOf = (id: string) => leads.find(l => l.orderId === id);

  const write = (partsOrders: PartsOrder[]) =>
    onSave({ ...card, partsOrders: partsOrders.length ? partsOrders : undefined });

  const raise = () => {
    if (!desc.trim()) return toast.error('Say what part is on order.');
    if (!vendor.trim()) return toast.error('Say who it was ordered from.');
    const order: PartsOrder = {
      id: newId('po'),
      description: desc.trim(),
      partNumber: pn.trim() || undefined,
      vendor: vendor.trim(),
      orderedAtUtc: new Date().toISOString(),
      note: note.trim() || undefined,
    };
    write([...orders, order]);
    setDesc(''); setPn(''); setVendor(DEFAULT_VENDOR); setNote('');
    if (!waitingPartsAlready) onOfferWaitingParts(order);
  };

  const markReceived = (id: string) =>
    write(orders.map(o => (o.id === id ? { ...o, receivedAtUtc: new Date().toISOString() } : o)));

  const undoReceived = (id: string) =>
    write(orders.map(o => (o.id === id ? { ...o, receivedAtUtc: undefined } : o)));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4" /> Parts on order ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.map(o => {
          const lead = leadOf(o.id);
          return (
            <div key={o.id} className="flex flex-col gap-1 rounded-md border p-2 text-sm md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="font-medium">
                  {o.description}
                  {o.partNumber && <span className="ml-2 font-mono text-xs text-muted-foreground">{o.partNumber}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {o.vendor} · ordered {new Date(o.orderedAtUtc).toLocaleString()}
                  {o.receivedAtUtc && ` · received ${new Date(o.receivedAtUtc).toLocaleString()}`}
                </div>
                {o.note && <div className="mt-0.5 border-l-2 pl-2 text-xs italic text-muted-foreground">{o.note}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lead && (
                  <Badge variant="outline" className={lead.open ? 'border-dashed' : ''}>
                    {lead.hours} h {lead.open ? 'and counting' : 'lead time'}
                  </Badge>
                )}
                {canEdit && (o.receivedAtUtc
                  ? <Button size="sm" variant="ghost" onClick={() => undoReceived(o.id)}>Undo received</Button>
                  : <Button size="sm" variant="outline" onClick={() => markReceived(o.id)}>
                      <PackageCheck className="mr-1.5 h-3.5 w-3.5" /> Mark received
                    </Button>)}
                {canEdit && !o.receivedAtUtc && (
                  <Button size="icon" variant="ghost" aria-label={`Remove order ${o.description}`}
                    onClick={() => write(orders.filter(x => x.id !== o.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {orders.length === 0 && <p className="text-sm text-muted-foreground">No parts on order against this card.</p>}

        {canEdit && (
          <div className="space-y-2 rounded-md border border-dashed p-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label htmlFor="po-desc" className="text-xs">Part</Label>
                <Input id="po-desc" className="mt-1 h-9" value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. Main ship battery" />
              </div>
              <div>
                <Label htmlFor="po-pn" className="text-xs">Part number</Label>
                <Input id="po-pn" className="mt-1 h-9" value={pn} onChange={e => setPn(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="po-vendor" className="text-xs">Ordered from</Label>
                <Input id="po-vendor" className="mt-1 h-9" value={vendor} onChange={e => setVendor(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="po-note" className="text-xs">Note</Label>
                <Input id="po-note" className="mt-1 h-9" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Optional — order reference, promised ETA" />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={raise}><Plus className="mr-1.5 h-4 w-4" /> Raise order</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
