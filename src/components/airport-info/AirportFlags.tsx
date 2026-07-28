import React from 'react';
import { AlertTriangle, Info, TriangleAlert } from 'lucide-react';

import { matchingRules, type FlagRule, type FlagSeverity } from '../../airport/flags/rules';
import type { AirportRecord } from '../../airport/types';
import { useCompanyAirport } from './CompanyAirportContext';

/**
 * The flags a crew sees for an airport (D50).
 *
 * Computed from the reference data by the operator's own rules, so the same
 * facts produce the same warnings everywhere — the airport page and, once wired,
 * the pilot workspace before a trip.
 */

const STYLE: Record<FlagSeverity, { box: string; Icon: typeof Info }> = {
  warning: { box: 'border-red-200 bg-red-50 text-red-900', Icon: TriangleAlert },
  caution: { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', Icon: Info },
};

export function AirportFlags({
  airport,
  aircraftType,
  compact = false,
}: {
  airport: AirportRecord;
  aircraftType?: string;
  compact?: boolean;
}) {
  const company = useCompanyAirport();
  const matched = matchingRules(company.rules(), airport, aircraftType);

  if (matched.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {matched.map((rule) => (
          <span
            key={rule.id}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${STYLE[rule.severity].box}`}
          >
            {React.createElement(STYLE[rule.severity].Icon, { className: 'h-3 w-3' })}
            {rule.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matched.map((rule: FlagRule) => {
        const { box, Icon } = STYLE[rule.severity];
        return (
          <div key={rule.id} className={`flex items-start gap-3 rounded border p-3 ${box}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{rule.label}</p>
              {rule.guidance ? <p className="mt-0.5 text-sm">{rule.guidance}</p> : null}
              {rule.appliesTo.length > 0 ? (
                <p className="mt-0.5 text-xs opacity-80">
                  Applies to {rule.appliesTo.join(', ')}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
