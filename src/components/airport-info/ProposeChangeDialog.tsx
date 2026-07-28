import React, { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

import type { CompanyAirportPageContent } from '../../airport/company/pageStore';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useCompanyAirport } from './CompanyAirportContext';

/**
 * Propose a company-page change (D46).
 *
 * The panel shows who will have to approve BEFORE the proposer submits, because
 * the routing is computed from the fields they touch — editing a curfew quietly
 * pulling in the chief pilot is exactly the kind of surprise that makes people
 * stop using a workflow.
 */

type FieldKey = keyof Omit<CompanyAirportPageContent, 'referenceAnnotations'>;

const FIELDS: { key: FieldKey; label: string; hint: string; safety: boolean }[] = [
  {
    key: 'opsNotes',
    label: 'Operations notes',
    hint: 'Anything a crew should know that no dataset carries.',
    safety: false,
  },
  {
    key: 'fboPreference',
    label: 'Preferred FBO / handler',
    hint: 'Which one we use, and why.',
    safety: false,
  },
  {
    key: 'ppr',
    label: 'PPR',
    hint: 'Prior permission required — who to call, how far ahead.',
    safety: true,
  },
  {
    key: 'curfew',
    label: 'Curfew',
    hint: 'Local restrictions on movement times.',
    safety: true,
  },
  {
    key: 'rampHandlingLimits',
    label: 'Ramp and handling limits',
    hint: 'Weight, span, parking or handling constraints we operate to.',
    safety: true,
  },
];

interface ProposeChangeDialogProps {
  icao: string;
  airportName: string;
  currentUserOid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposeChangeDialog({
  icao,
  airportName,
  currentUserOid,
  open,
  onOpenChange,
}: ProposeChangeDialogProps) {
  const company = useCompanyAirport();
  const current = company.getLatest(icao);

  const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changedFields = useMemo(
    () =>
      FIELDS.filter((field) => {
        const next = values[field.key];
        if (next === undefined) return false;
        return (next.trim() || null) !== (current?.content[field.key] ?? null);
      }).map((field) => field.key),
    [values, current],
  );

  const approvers = company.approvalsFor(changedFields);
  const needsChiefPilot = approvers.includes('chief-pilot');

  const submit = () => {
    if (!reason.trim()) {
      setError('A reason is required — an unexplained edit is not reviewable.');
      return;
    }
    if (changedFields.length === 0) {
      setError('Nothing has changed yet.');
      return;
    }

    const changes: Partial<CompanyAirportPageContent> = {};
    for (const key of changedFields) changes[key] = values[key]?.trim() || null;

    company.submit({ icao, submittedBy: currentUserOid, reason: reason.trim(), changes });
    setValues({});
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Propose a change — {icao}</DialogTitle>
          <DialogDescription>
            {airportName}. This proposes a change to the company page. FAA reference data cannot be
            edited here; if it looks wrong, say so in the reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key} className="flex items-center gap-2">
                {field.label}
                {field.safety ? (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                    chief pilot
                  </span>
                ) : null}
              </Label>
              <p className="mb-1 text-xs text-muted-foreground">{field.hint}</p>
              <Textarea
                id={field.key}
                rows={2}
                value={values[field.key] ?? current?.content[field.key] ?? ''}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}

          <div>
            <Label htmlFor="reason">Reason for the change</Label>
            <p className="mb-1 text-xs text-muted-foreground">
              What prompted this, and how it was confirmed. The reviewer sees only this.
            </p>
            <Textarea
              id="reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          {changedFields.length > 0 ? (
            <div
              className={`flex items-start gap-2 rounded border p-3 text-sm ${
                needsChiefPilot
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-border bg-muted/40 text-muted-foreground'
              }`}
            >
              {needsChiefPilot ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              <span>
                {changedFields.length} field{changedFields.length === 1 ? '' : 's'} changed. Needs
                approval from {approvers.join(' and ')}.
                {needsChiefPilot
                  ? ' A safety field is involved, so two different people must approve.'
                  : ''}
              </span>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit for review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
