import { useState } from 'react';
import { CheckCircle2, MessageSquarePlus, MessagesSquare, Send, UserRound, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { GfoPanel } from '../../gfo';
import type { Personnel } from '../../tech-log/types';
import type { FirAction } from '../reducer';
import { visibleStatements, type FirViewer } from '../engine/access';
import type { FlightIrregularityReport } from '../types';

let seq = 0;
const localId = () => `st-${Date.now().toString(36)}-${(seq += 1)}`;

const STATUS_TONE: Record<string, 'default' | 'secondary' | 'outline'> = {
  REQUESTED: 'secondary',
  SUBMITTED: 'default',
  DECLINED: 'outline',
};

interface Props {
  fir: FlightIrregularityReport;
  viewer: FirViewer;
  canRequest: boolean;
  personnel: Personnel[];
  dispatch: React.Dispatch<FirAction>;
  nameOf: (oid?: string, fallback?: string) => string;
}

/** §7 — the owner/leadership request attributed perspectives; a requestee sees only
 * their own request and responds (submit or decline). Statements are scoped by
 * visibleStatements, so this component renders the correct subset for either viewer. */
export function StatementsTab({ fir, viewer, canRequest, personnel, dispatch, nameOf }: Props) {
  const [requestOf, setRequestOf] = useState('');
  const [prompt, setPrompt] = useState('');
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [declineOpen, setDeclineOpen] = useState<Record<string, boolean>>({});
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});

  const statements = visibleStatements(fir, viewer);
  // People with no live (pending/answered) request yet — a declined ask may be re-issued.
  const requestable = personnel.filter(
    p => p.active && p.oid !== fir.ownerOid && !fir.statements.some(s => s.requestedOfOid === p.oid && s.status !== 'DECLINED'),
  );

  const request = () => {
    const person = personnel.find(p => p.oid === requestOf);
    if (!person || !prompt.trim()) return;
    dispatch({
      type: 'REQUEST_STATEMENT',
      payload: {
        firId: fir.id,
        statement: {
          id: localId(),
          requestedByOid: viewer.oid,
          requestedOfOid: person.oid,
          requestedOfRole: person.role,
          prompt: prompt.trim(),
          status: 'REQUESTED',
          requestedAtUtc: new Date().toISOString(),
        },
      },
    });
    setRequestOf('');
    setPrompt('');
  };

  const submit = (statementId: string) => {
    const text = (responseText[statementId] ?? '').trim();
    if (!text) return;
    dispatch({ type: 'SUBMIT_STATEMENT', payload: { firId: fir.id, statementId, text, atUtc: new Date().toISOString() } });
  };

  const decline = (statementId: string) => {
    dispatch({
      type: 'DECLINE_STATEMENT',
      payload: { firId: fir.id, statementId, reason: (declineReason[statementId] ?? '').trim() || undefined, atUtc: new Date().toISOString() },
    });
    setDeclineOpen(o => ({ ...o, [statementId]: false }));
  };

  return (
    <div className="space-y-4">
      {canRequest && (
        <GfoPanel title="Request a perspective">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr_auto]">
            <div>
              <Label className="text-xs">From</Label>
              <Select value={requestOf} onValueChange={setRequestOf}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select a person" /></SelectTrigger>
                <SelectContent>
                  {requestable.length === 0 ? (
                    <SelectItem value="none" disabled>Everyone available has been asked</SelectItem>
                  ) : (
                    requestable.map(p => (
                      <SelectItem key={p.oid} value={p.oid}>{p.displayName} · {p.role}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt</Label>
              <Input className="mt-1 h-9" value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Add your account of the de-ice decision at TEB" />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={request} disabled={!requestOf || requestOf === 'none' || !prompt.trim()}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Request
              </Button>
            </div>
          </div>
        </GfoPanel>
      )}

      <GfoPanel title={canRequest ? 'Statements' : 'Your requested statement'}>
        {statements.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessagesSquare className="h-4 w-4" />
            {canRequest ? 'No perspectives requested yet.' : 'Nothing is awaiting your input on this report.'}
          </div>
        ) : (
          <div className="space-y-3">
            {statements.map(s => {
              const mine = s.requestedOfOid === viewer.oid;
              return (
                <div key={s.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{nameOf(s.requestedOfOid)}</span>
                    <Badge variant="outline">{s.requestedOfRole}</Badge>
                    <Badge variant={STATUS_TONE[s.status]}>{s.status.toLowerCase()}</Badge>
                    {mine && s.status === 'REQUESTED' && <Badge variant="secondary">awaiting you</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm">
                    <span className="text-muted-foreground">Asked by {nameOf(s.requestedByOid)}: </span>“{s.prompt}”
                  </p>

                  {s.status === 'SUBMITTED' && (
                    <div className="mt-2 rounded bg-muted/40 p-2 text-sm">
                      <p className="whitespace-pre-wrap">{s.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {s.respondedAtUtc ? new Date(s.respondedAtUtc).toLocaleString() : ''}
                      </p>
                    </div>
                  )}
                  {s.status === 'DECLINED' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Declined{s.declineReason ? ` — “${s.declineReason}”` : ''}
                      {s.respondedAtUtc ? ` · ${new Date(s.respondedAtUtc).toLocaleString()}` : ''}
                    </p>
                  )}

                  {mine && s.status === 'REQUESTED' && (
                    <div className="mt-2 space-y-2 border-t pt-2">
                      <Textarea
                        rows={3}
                        value={responseText[s.id] ?? ''}
                        onChange={e => setResponseText(r => ({ ...r, [s.id]: e.target.value }))}
                        placeholder="Your account — attributed to you, visible to leadership and the owner."
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => submit(s.id)} disabled={!(responseText[s.id] ?? '').trim()}>
                          <Send className="mr-1.5 h-4 w-4" /> Submit
                        </Button>
                        {!declineOpen[s.id] ? (
                          <Button size="sm" variant="outline" onClick={() => setDeclineOpen(o => ({ ...o, [s.id]: true }))}>
                            <XCircle className="mr-1.5 h-4 w-4" /> Decline
                          </Button>
                        ) : (
                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            <Input
                              className="h-9 flex-1"
                              value={declineReason[s.id] ?? ''}
                              onChange={e => setDeclineReason(r => ({ ...r, [s.id]: e.target.value }))}
                              placeholder="Optional reason"
                            />
                            <Button size="sm" variant="outline" onClick={() => decline(s.id)}>
                              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GfoPanel>
    </div>
  );
}
