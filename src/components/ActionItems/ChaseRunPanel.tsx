import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bell, UserCheck, Clock, CheckCircle, SkipForward, X, Flag } from 'lucide-react';
import { ActionItem, CheckInCadence } from './types';
import { getDaysSinceLastReport, getLastReportDate, getOwner, isTrendFlat } from './stall';
import { ChaseVerb, VERB_LABEL, nextSlowerCadence, getPeopleRoster } from './chaseRun';
import { formatDate } from './utils';

interface ChaseRunPanelProps {
  /** Snapshot taken when the run started — see buildRunQueue. */
  queue: string[];
  allItems: ActionItem[];
  today: string;
  onNudge: (id: string) => void;
  onReassign: (id: string, personName: string) => void;
  onSlowCadence: (id: string, cadence: CheckInCadence) => void;
  onClose: (id: string, reason: string) => void;
  onExit: () => void;
}

/**
 * The reasons a lead-team project actually stops. Free text is allowed, but
 * offering the common answers means the reason gets captured rather than
 * skipped — an unlabelled close is the one nobody can answer for later.
 */
const CLOSURE_REASONS = [
  'Delivered — the work is done',
  'Superseded by another project',
  'No longer a priority',
  'Absorbed into business as usual',
  'Cancelled — will not proceed',
];

/**
 * One quiet project at a time, five verbs, a progress bar, an end.
 *
 * The chase list answers "who do I call"; this answers "am I done yet", which a
 * standing list can never answer. Every project in the run gets a decision and
 * the run records which — so the summary at the end is what actually happened,
 * not a count of screens dismissed.
 */
export default function ChaseRunPanel({
  queue, allItems, today, onNudge, onReassign, onSlowCadence, onClose, onExit,
}: ChaseRunPanelProps) {
  const [index, setIndex] = useState(0);
  const [handled, setHandled] = useState<Array<{ id: string; title: string; verb: ChaseVerb }>>([]);
  const [reassigning, setReassigning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  const byId = new Map(allItems.map(item => [item.id, item]));
  const current = index < queue.length ? byId.get(queue[index]) ?? null : null;
  const done = index >= queue.length;

  const advance = (item: ActionItem, verb: ChaseVerb) => {
    setHandled(prev => [...prev, { id: item.id, title: item.title, verb }]);
    setReassigning(false);
    setClosing(false);
    setCloseReason('');
    setIndex(prev => prev + 1);
  };

  if (done) {
    const tally = handled.reduce((acc, entry) => {
      acc[entry.verb] = (acc[entry.verb] ?? 0) + 1;
      return acc;
    }, {} as Record<ChaseVerb, number>);

    return (
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h2>Chase run complete</h2>
              <p className="text-muted-foreground">
                {handled.length} {handled.length === 1 ? 'project' : 'projects'} handled.
              </p>
            </div>
          </div>

          {handled.length > 0 && (
            <>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(tally) as ChaseVerb[]).map(verb => (
                  <Badge key={verb} variant="outline">{VERB_LABEL[verb]} {tally[verb]}</Badge>
                ))}
              </div>

              <div className="divide-y border rounded-md">
                {handled.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="flex-1 min-w-0 truncate">{entry.title}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{VERB_LABEL[entry.verb]}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Button onClick={onExit}>Back to the list</Button>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    // A project in the snapshot no longer exists — skip past it rather than stall.
    setIndex(prev => prev + 1);
    return null;
  }

  const silence = getDaysSinceLastReport(current, today) ?? 0;
  const lastReport = getLastReportDate(current);
  const owner = getOwner(current);
  const slower = nextSlowerCadence(current.checkIn?.cadence);
  const roster = getPeopleRoster(allItems).filter(name => name !== owner?.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-3 flex-1">
          <h2>Chase run</h2>
          <span className="text-sm text-muted-foreground">
            {index} of {queue.length} handled
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X className="w-4 h-4 mr-2" />
          End run
        </Button>
      </div>

      <Progress value={(index / queue.length) * 100} className="h-1.5" />

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-medium">{current.title}</h3>
              <Badge variant="outline" className="text-xs">{current.priority}</Badge>
              <Badge variant="outline" className="text-xs">{current.module}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {owner?.name ?? 'Nobody assigned'} · silent {silence} days ·{' '}
              {isTrendFlat(current) ? `flat at ${current.progress}%` : `last reported ${current.progress}%`}
              {lastReport && ` since ${formatDate(lastReport)}`}
            </p>
            {current.checkIn?.lastNudgedOn && (
              <p className="text-sm text-amber-600 mt-1">
                <Flag className="w-3.5 h-3.5 inline mr-1" />
                Already nudged {formatDate(current.checkIn.lastNudgedOn)} with no reply.
              </p>
            )}
          </div>

          {reassigning ? (
            <div className="flex items-center gap-3 flex-wrap">
              <Select onValueChange={(name: string) => { onReassign(current.id, name); advance(current, 'reassigned'); }}>
                <SelectTrigger className="w-[240px]"><SelectValue placeholder="Hand it to…" /></SelectTrigger>
                <SelectContent>
                  {roster.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setReassigning(false)}>Cancel</Button>
            </div>
          ) : closing ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Why is this closing at {current.progress}%?
              </Label>
              <div className="flex gap-2 flex-wrap">
                {CLOSURE_REASONS.map(reason => (
                  <Button
                    key={reason}
                    variant={closeReason === reason ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCloseReason(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
              <Textarea
                rows={2}
                placeholder="Or write your own…"
                value={CLOSURE_REASONS.includes(closeReason) ? '' : closeReason}
                onChange={e => setCloseReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  disabled={!closeReason.trim()}
                  onClick={() => { onClose(current.id, closeReason.trim()); advance(current, 'closed'); }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Close it
                </Button>
                <Button variant="ghost" onClick={() => { setClosing(false); setCloseReason(''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => { onNudge(current.id); advance(current, 'nudged'); }}>
                <Bell className="w-4 h-4 mr-2" />
                Nudge
              </Button>
              <Button variant="outline" disabled={roster.length === 0} onClick={() => setReassigning(true)}>
                <UserCheck className="w-4 h-4 mr-2" />
                Reassign
              </Button>
              <Button
                variant="outline"
                disabled={!slower}
                title={slower ? undefined : 'Already on the slowest cadence'}
                onClick={() => { if (slower) { onSlowCadence(current.id, slower); advance(current, 'slowed'); } }}
              >
                <Clock className="w-4 h-4 mr-2" />
                {slower ? `Slow to ${slower}` : 'Slowest cadence'}
              </Button>
              <Button variant="outline" onClick={() => setClosing(true)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Close it
              </Button>
              <Button variant="ghost" onClick={() => advance(current, 'skipped')}>
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {index + 1 < queue.length && (
        <div className="flex gap-2 flex-wrap text-sm text-muted-foreground">
          {queue.slice(index + 1, index + 4).map((id, offset) => (
            <span key={id} className="px-3 py-1 rounded-md bg-muted truncate max-w-[240px]">
              {offset === 0 ? 'next: ' : 'then: '}
              {byId.get(id)?.title ?? 'unknown project'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
