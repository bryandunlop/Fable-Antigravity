import { useTechLog } from '../TechLogContext';
import { lifecycleStep } from '../engine/lifecycle';
import type { Aircraft } from '../types';

export type StepKey = 'PREFLIGHT' | 'RELEASED' | 'ACCEPTED' | 'IN_SERVICE' | 'POSTFLIGHT';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'PREFLIGHT', label: 'Preflight' },
  { key: 'RELEASED', label: 'Released' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_SERVICE', label: 'In service' },
  { key: 'POSTFLIGHT', label: 'Postflight' },
];
const ORDER: StepKey[] = ['PREFLIGHT', 'RELEASED', 'ACCEPTED', 'IN_SERVICE', 'POSTFLIGHT'];

export function LifecycleStepper({ aircraft, onSelect }: { aircraft: Aircraft; onSelect: (key: StepKey) => void }) {
  const { state } = useTechLog();
  const now = new Date().toISOString();
  const { step, custody } = lifecycleStep(aircraft.id, state, now);
  const currentIdx = ORDER.indexOf(step);
  // POSTFLIGHT becomes actionable once the crew holds the aircraft (maintenance reclaim).
  const postflightActive = custody.state === 'WITH_CREW';

  return (
    <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-2">
      {STEPS.map((s, i) => {
        const reached = i <= currentIdx || (s.key === 'POSTFLIGHT' && postflightActive);
        const isCurrent = s.key === step || (s.key === 'POSTFLIGHT' && postflightActive && step === 'IN_SERVICE');
        return (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => onSelect(s.key)}
              disabled={!reached}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                isCurrent ? 'bg-secondary font-medium text-foreground' : reached ? 'text-foreground hover:bg-background' : 'text-muted-foreground/50',
              ].join(' ')}>
              <span className={['inline-block h-2 w-2 rounded-full', isCurrent ? 'bg-primary' : reached ? 'bg-[var(--gfo-daylight)]' : 'bg-muted-foreground/40'].join(' ')} />
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="px-1 text-muted-foreground/40">›</span>}
          </div>
        );
      })}
    </div>
  );
}
