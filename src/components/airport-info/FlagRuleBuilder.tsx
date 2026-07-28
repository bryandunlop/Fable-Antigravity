import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import {
  FLAG_FIELDS,
  OPERATOR_LABEL,
  operatorsFor,
  previewMatches,
  type AirportFacts,
  type FlagCondition,
  type FlagRule,
  type FlagSeverity,
  type Operator,
} from '../../airport/flags/rules';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useCompanyAirport } from './CompanyAirportContext';

/**
 * Build the rules that flag airports (D50).
 *
 * The live match count is the point, not a nicety. A rule builder without one is
 * how a rule set goes bad quietly: you write "short runway" meaning a handful of
 * tight fields, it flags fourteen hundred, and crews learn to ignore flags.
 */

const SEVERITIES: FlagSeverity[] = ['info', 'caution', 'warning'];

const VALUELESS: Operator[] = ['isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'];

function blankRule(): FlagRule {
  return {
    id: `rule-${Math.random().toString(36).slice(2, 9)}`,
    label: '',
    severity: 'caution',
    appliesTo: [],
    showOnPilotWorkspace: true,
    group: { combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 6000 }] },
  };
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: FlagCondition;
  onChange: (next: FlagCondition) => void;
  onRemove: () => void;
}) {
  const field = FLAG_FIELDS.find((f) => f.key === condition.field);
  const operators = operatorsFor(condition.field);
  const needsValue = !VALUELESS.includes(condition.operator);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border p-2">
      <select
        className="rounded border bg-background px-2 py-1 text-sm"
        value={condition.field}
        onChange={(event) => {
          const nextField = event.target.value as FlagCondition['field'];
          onChange({ field: nextField, operator: operatorsFor(nextField)[0], value: undefined });
        }}
      >
        {FLAG_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className="rounded border bg-background px-2 py-1 text-sm"
        value={condition.operator}
        onChange={(event) => onChange({ ...condition, operator: event.target.value as Operator })}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>

      {needsValue ? (
        <Input
          className="w-40"
          value={condition.value ?? ''}
          onChange={(event) => {
            const raw = event.target.value;
            const numeric = field?.type === 'number' ? Number(raw) : raw;
            onChange({
              ...condition,
              value: field?.type === 'number' && Number.isFinite(numeric) ? numeric : raw,
            });
          }}
        />
      ) : null}

      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove condition">
        <Trash2 className="h-4 w-4" />
      </Button>

      {field?.hint ? (
        <p className="w-full text-xs text-muted-foreground">{field.hint}</p>
      ) : null}
    </div>
  );
}

function RuleEditor({
  rule,
  facts,
  onSave,
  onCancel,
}: {
  rule: FlagRule;
  facts: Record<string, AirportFacts> | null;
  onSave: (rule: FlagRule) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<FlagRule>(rule);

  const preview = useMemo(
    () => (facts ? previewMatches(draft, facts) : null),
    [draft, facts],
  );

  const update = (patch: Partial<FlagRule>) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateConditions = (conditions: FlagCondition[]) =>
    setDraft((prev) => ({ ...prev, group: { ...prev.group, conditions } }));

  return (
    <Card className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor="rule-label">Flag name</Label>
          <Input
            id="rule-label"
            value={draft.label}
            placeholder="Short runway"
            onChange={(event) => update({ label: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="rule-severity">Severity</Label>
          <select
            id="rule-severity"
            className="h-9 w-full rounded border bg-background px-2 text-sm"
            value={draft.severity}
            onChange={(event) => update({ severity: event.target.value as FlagSeverity })}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="rule-guidance">Guidance shown to the crew</Label>
        <Textarea
          id="rule-guidance"
          rows={2}
          value={draft.guidance ?? ''}
          onChange={(event) => update({ guidance: event.target.value })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-3">
          <Label>Conditions</Label>
          <select
            className="rounded border bg-background px-2 py-1 text-sm"
            value={draft.group.combine}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                group: { ...prev.group, combine: event.target.value as 'AND' | 'OR' },
              }))
            }
          >
            <option value="AND">match all</option>
            <option value="OR">match any</option>
          </select>
        </div>

        <div className="space-y-2">
          {draft.group.conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              onChange={(next) =>
                updateConditions(draft.group.conditions.map((c, i) => (i === index ? next : c)))
              }
              onRemove={() =>
                updateConditions(draft.group.conditions.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            updateConditions([
              ...draft.group.conditions,
              { field: 'longestRunwayFt', operator: 'lt', value: 6000 },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add condition
        </Button>
      </div>

      <div className="rounded border bg-muted/40 p-3 text-sm">
        {preview === null ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading airports to preview against…
          </span>
        ) : (
          <>
            <span className="font-medium">
              Flags {preview.matched.length.toLocaleString()} of{' '}
              {preview.total.toLocaleString()} airports
            </span>
            {preview.matched.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                e.g. {preview.matched.slice(0, 12).join(', ')}
                {preview.matched.length > 12 ? ' …' : ''}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing matches. Check the thresholds — a rule that flags nothing is as useless as
                one that flags everything.
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave(draft)} disabled={!draft.label.trim()}>
          Save flag
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

export default function FlagRuleBuilder() {
  const company = useCompanyAirport();
  const [facts, setFacts] = useState<Record<string, AirportFacts> | null>(null);
  const [editing, setEditing] = useState<FlagRule | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/airport-data/facts.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setFacts(payload.facts);
      })
      .catch(() => {
        /* preview simply stays unavailable; the rules still work */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rules = company.rules();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Airport flags</h1>
          <p className="mt-1 text-muted-foreground">
            Rules that flag an airport from its FAA reference data. Each shows how many of the{' '}
            {facts ? Object.keys(facts).length.toLocaleString() : '2,128'} airports it matches
            before you save it.
          </p>
        </div>
        <Button onClick={() => setEditing(blankRule())}>
          <Plus className="mr-2 h-4 w-4" />
          New flag
        </Button>
      </div>

      {editing ? (
        <RuleEditor
          rule={editing}
          facts={facts}
          onSave={(rule) => {
            company.saveRule(rule);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <div className="space-y-2">
        {rules.length === 0 ? (
          <Card className="p-6 text-muted-foreground">No flags defined yet.</Card>
        ) : (
          rules.map((rule) => {
            const count = facts ? previewMatches(rule, facts).matched.length : null;
            return (
              <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.label}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {rule.severity}
                    </span>
                    {rule.showOnPilotWorkspace ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        pilot workspace
                      </span>
                    ) : null}
                  </div>
                  {rule.guidance ? (
                    <p className="mt-1 text-sm text-muted-foreground">{rule.guidance}</p>
                  ) : null}
                  {count !== null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      flags {count.toLocaleString()} airports
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(rule)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => company.deleteRule(rule.id)}
                    aria-label={`Delete ${rule.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
