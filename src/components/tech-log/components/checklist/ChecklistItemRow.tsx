import { useState } from 'react';
import { CheckCircle2, Circle, CircleDot, MinusCircle } from 'lucide-react';
import type { ChecklistItemDef, ChecklistItemEntry } from '../../types';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';

export function ChecklistItemRow({
  item, entry, nameOf, currentUserOid, onClaim, onComplete, onNA, disabled,
}: {
  item: ChecklistItemDef;
  entry: ChecklistItemEntry;
  nameOf: (oid?: string) => string;
  currentUserOid: string;
  onClaim: () => void;
  onComplete: (values?: Record<string, string>, note?: string) => void;
  onNA: (reason: string) => void;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [naReason, setNaReason] = useState('');
  const [naOpen, setNaOpen] = useState(false);

  const who = (oid?: string) => (oid === currentUserOid ? 'you' : nameOf(oid));

  const canComplete =
    item.kind === 'MEASUREMENT'
      ? (item.fields ?? []).every(f => (values[f.id] ?? '').trim().length > 0)
      : item.kind === 'NOTE'
        ? note.trim().length > 0
        : true;

  if (entry.state === 'DONE') {
    return (
      <div className="flex items-start gap-2 rounded-md border p-2 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--gfo-success,#00B140)' }} />
        <div className="flex-1">
          <div>{item.label}{item.reference && <span className="ml-1.5 text-xs text-muted-foreground">({item.reference})</span>}</div>
          {entry.values && Object.keys(entry.values).length > 0 && (
            <div className="text-xs text-muted-foreground">
              {(item.fields ?? []).map(f => `${f.label}: ${entry.values?.[f.id] ?? '—'} ${f.unit}`).join(' · ')}
            </div>
          )}
          {entry.note && <div className="text-xs text-muted-foreground">{entry.note}</div>}
          <div className="text-xs text-muted-foreground">completed by {nameOf(entry.completedByOid)}{entry.completedAtUtc ? ` · ${new Date(entry.completedAtUtc).toLocaleTimeString()}` : ''}</div>
        </div>
      </div>
    );
  }

  if (entry.state === 'NA') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground">
        <MinusCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <div>{item.label} — N/A ({entry.naReason})</div>
          <div className="text-xs">by {nameOf(entry.completedByOid)}{entry.completedAtUtc ? ` · ${new Date(entry.completedAtUtc).toLocaleTimeString()}` : ''}</div>
        </div>
      </div>
    );
  }

  if (entry.state === 'IN_PROGRESS') {
    return (
      <div className="space-y-2 rounded-md border p-2 text-sm" style={{ borderColor: 'var(--gfo-daylight,#0096FC)' }}>
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 shrink-0" style={{ color: 'var(--gfo-daylight,#0096FC)' }} />
          <span className="flex-1">{item.label}{item.reference && <span className="ml-1.5 text-xs text-muted-foreground">({item.reference})</span>}</span>
          <Badge variant="outline">in progress · {who(entry.startedByOid)}</Badge>
        </div>
        {item.kind === 'MEASUREMENT' && (
          <div className="flex flex-wrap gap-2 pl-6">
            {(item.fields ?? []).map(f => (
              <div key={f.id} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{f.label}{f.target ? ` (${f.target})` : ''}</span>
                <div className="flex items-center gap-1">
                  <Input className="w-24" inputMode="decimal" value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />
                  <span className="text-xs text-muted-foreground">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {item.kind === 'NOTE' && <Textarea className="ml-6 w-[calc(100%-1.5rem)]" value={note} onChange={e => setNote(e.target.value)} placeholder="Enter note" />}
        <div className="flex items-center gap-2 pl-6">
          <Button size="sm" disabled={!canComplete} onClick={() => onComplete(item.kind === 'MEASUREMENT' ? values : undefined, item.kind === 'NOTE' ? note : undefined)}>Done</Button>
          {!item.requiredToRelease && !naOpen && <Button size="sm" variant="ghost" onClick={() => setNaOpen(true)}>N/A</Button>}
          {!item.requiredToRelease && naOpen && (
            <>
              <Input className="w-40" placeholder="Reason" value={naReason} onChange={e => setNaReason(e.target.value)} />
              <Button size="sm" variant="outline" disabled={!naReason.trim()} onClick={() => onNA(naReason.trim())}>Confirm N/A</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">{item.label}{item.reference && <span className="ml-1.5 text-xs text-muted-foreground">({item.reference})</span>}</span>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onClaim}>Start</Button>
    </div>
  );
}
