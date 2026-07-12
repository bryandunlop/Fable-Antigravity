import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { useTechLog } from '../../tech-log/TechLogContext';
import { readFirState } from '../engine/select';
import { buildDefectFirSuggestions, DEFAULT_FIR_SUGGESTION_CONFIG } from '../engine/suggestions';

const DISMISS_KEY = 'fir-suggestions-dismissed';

function readDismissed(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

/** "Open an FIR?" nudges (§8), rendered on the AOG board. Reads the FIR store
 * read-only (outside FirProvider) to skip anything already reported, and remembers
 * dismissals so it doesn't re-nag. Retrospective: it only suggests, never coordinates. */
export function FirSuggestions({ aircraftId }: { aircraftId?: string }) {
  const { state: techLog } = useTechLog();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const suggestions = useMemo(() => {
    const firs = readFirState(localStorage).firs;
    const now = new Date().toISOString();
    return buildDefectFirSuggestions(techLog, firs, dismissed, DEFAULT_FIR_SUGGESTION_CONFIG, now)
      .filter(s => !aircraftId || s.aircraftId === aircraftId);
  }, [techLog, dismissed, aircraftId]);

  if (suggestions.length === 0) return null;

  const dismiss = (key: string) => {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-2">
      {suggestions.map(s => (
        <div key={s.key} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Flag className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">Open a Flight Irregularity Report?</span>
            <span className="ml-2 text-xs text-muted-foreground">{s.reason} · evidence pre-anchored</span>
          </div>
          <Button size="sm" variant="outline" className="h-7" onClick={() => navigate(`/fir/new?defect=${s.defectId}`)}>
            <Flag className="mr-1.5 h-3.5 w-3.5" /> Open FIR
          </Button>
          <button type="button" onClick={() => dismiss(s.key)} aria-label="Dismiss suggestion" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
