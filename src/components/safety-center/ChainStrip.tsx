// The approval chain, drawn (D85 · C5). Shared by the safety manager's Decide
// panel and the final approver's inbox.
//
// It exists because the first hi-fi Decide screen had the safety manager
// pressing "Approve and sign" — wrong role, wrong finality. The chain is
// crew → safety → line manager, and the strip is what stops anyone mistaking
// their step for the last one.

import { Check, X, Clock, Plus } from 'lucide-react';
import { roleLabel, type ApprovalRequest, type ApprovalStep } from './approvalRequests';

type StepState = 'done' | 'denied' | 'now' | 'waiting';

export interface ChainNode {
  key: string;
  /** The person if one is named, else the role — a named step is addressed to
   *  one individual and saying "Lead Team" would misdescribe who can act. */
  who: string;
  sub: string;
  state: StepState;
}

export function chainNodes(req: ApprovalRequest): ChainNode[] {
  const filed: ChainNode = {
    key: 'filed',
    who: req.requestedByName,
    sub: 'Requested',
    state: 'done',
  };
  const steps = req.chain.map((st: ApprovalStep, i: number): ChainNode => {
    const state: StepState =
      st.status === 'approved' ? 'done'
      : st.status === 'denied' ? 'denied'
      : i === req.currentStep && req.status === 'pending' ? 'now'
      : 'waiting';
    const sub =
      state === 'done' ? `Approved${st.decidedByName ? ` · ${st.decidedByName}` : ''}`
      : state === 'denied' ? `Declined${st.decidedByName ? ` · ${st.decidedByName}` : ''}`
      : state === 'now' ? 'Deciding now'
      : i === req.chain.length - 1 ? 'Final approval'
      : 'Then';
    return {
      key: `step-${i}`,
      who: st.assigneeName ?? roleLabel(st.role),
      sub,
      state,
    };
  });
  return [filed, ...steps];
}

const ICON = { done: Check, denied: X, now: Plus, waiting: Clock } as const;

function dotClass(state: StepState): string {
  if (state === 'done') return 'bg-[color:var(--gfo-success-ink)] border-[color:var(--gfo-success-ink)] text-white';
  if (state === 'denied') return 'bg-[color:var(--gfo-error-ink)] border-[color:var(--gfo-error-ink)] text-white';
  if (state === 'now') return 'bg-primary border-primary text-primary-foreground';
  return 'bg-card border-border text-muted-foreground';
}

export function ChainStrip({ req, className = '' }: { req: ApprovalRequest; className?: string }) {
  const nodes = chainNodes(req);
  return (
    <ol className={`flex items-start sm:items-center gap-2 sm:gap-0 flex-col sm:flex-row sm:flex-wrap ${className}`} aria-label="Approval chain">
      {nodes.map((n, i) => {
        const Icon = ICON[n.state];
        return (
          <li key={n.key} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <span className={`w-[26px] h-[26px] rounded-full border-[1.5px] grid place-items-center shrink-0 ${dotClass(n.state)}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="leading-tight">
                <span className={`block text-[12.5px] ${n.state === 'now' ? 'font-bold' : 'font-medium'} ${n.state === 'waiting' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {n.who}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-px">{n.sub}</span>
              </span>
            </div>
            {/* The connector is decoration between nodes on one line. Once the
                strip wraps — which it always does on a phone — a dash hanging
                off the end of each row points at nothing, so it is dropped
                below sm and the nodes read as a stacked list instead. */}
            {i < nodes.length - 1 && <span className="hidden sm:block w-8 h-px bg-border mx-3 shrink-0" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
