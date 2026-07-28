/**
 * Airport flag rules (D50).
 *
 * Bryan chose a rule builder over a fixed flag set. The constraint that keeps
 * that buildable is this condition model: `field · operator · value`, grouped by
 * AND or OR, over a typed allow-list. No expression parser, no scripting, no
 * arbitrary code. Every rule is data — serialisable, diffable, versionable, and
 * evaluable against the whole 2,128-airport bundle so a builder can show how many
 * airports a rule matches before anyone saves it.
 *
 * WEIGHT FIELDS ARE DELIBERATELY ABSENT. `GROSS_WT_*` has no documented unit
 * (TL-31), and a rule comparing an unlabelled number against an aircraft weight
 * is exactly the 1000x error that gap exists to prevent. The field cannot be
 * offered until a primary source is read.
 */

import type { AirportRecord } from '../types';

export type FlagSeverity = 'info' | 'caution' | 'warning';

export type FieldType = 'number' | 'boolean' | 'string' | 'stringList';

export type Operator =
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'eq'
  | 'neq'
  | 'isTrue'
  | 'isFalse'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'
  | 'notContains';

const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  number: ['lt', 'lte', 'gt', 'gte', 'eq'],
  boolean: ['isTrue', 'isFalse'],
  string: ['eq', 'neq', 'isEmpty', 'isNotEmpty'],
  stringList: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
};

export const OPERATOR_LABEL: Record<Operator, string> = {
  lt: 'is less than',
  lte: 'is at most',
  gt: 'is more than',
  gte: 'is at least',
  eq: 'is',
  neq: 'is not',
  isTrue: 'is yes',
  isFalse: 'is no',
  isEmpty: 'is not published',
  isNotEmpty: 'is published',
  contains: 'includes',
  notContains: 'does not include',
};

/** The facts a rule may be written against. Derived once per airport. */
export interface AirportFacts {
  longestRunwayFt: number | null;
  shortestRunwayFt: number | null;
  narrowestRunwayFt: number | null;
  shortestLdaFt: number | null;
  shortestToraFt: number | null;
  hasDeclaredDistances: boolean;
  hasPavementClassification: boolean;
  elevationFt: number | null;
  surfaces: string[];
  fuelTypes: string[];
  towerTypeCode: string | null;
  far139TypeCode: string | null;
  stateCode: string | null;
  customsAvailable: boolean;
  landingFee: boolean;
  hasIcaoId: boolean;
}

export interface FlagField {
  key: keyof AirportFacts;
  label: string;
  type: FieldType;
  /** Shown in the builder so a rule author knows what they are comparing. */
  hint?: string;
}

export const FLAG_FIELDS: readonly FlagField[] = [
  { key: 'longestRunwayFt', label: 'Longest runway (ft)', type: 'number' },
  { key: 'shortestRunwayFt', label: 'Shortest runway (ft)', type: 'number' },
  { key: 'narrowestRunwayFt', label: 'Narrowest runway width (ft)', type: 'number' },
  {
    key: 'shortestLdaFt',
    label: 'Shortest published LDA (ft)',
    type: 'number',
    hint: 'Only 26.6% of airports publish declared distances; the rest are unknown, not zero.',
  },
  { key: 'shortestToraFt', label: 'Shortest published TORA (ft)', type: 'number' },
  { key: 'hasDeclaredDistances', label: 'Declared distances published', type: 'boolean' },
  { key: 'hasPavementClassification', label: 'Pavement strength published', type: 'boolean' },
  { key: 'elevationFt', label: 'Field elevation (ft)', type: 'number' },
  { key: 'surfaces', label: 'Runway surfaces', type: 'stringList' },
  { key: 'fuelTypes', label: 'Fuel grades', type: 'stringList' },
  { key: 'towerTypeCode', label: 'Tower', type: 'string' },
  { key: 'far139TypeCode', label: 'FAR 139 class', type: 'string' },
  { key: 'stateCode', label: 'State', type: 'string' },
  { key: 'customsAvailable', label: 'Customs available', type: 'boolean' },
  { key: 'landingFee', label: 'Landing fee', type: 'boolean' },
  { key: 'hasIcaoId', label: 'Has an ICAO identifier', type: 'boolean' },
];

const FIELD_BY_KEY = new Map(FLAG_FIELDS.map((field) => [field.key, field]));

export function operatorsFor(key: keyof AirportFacts): Operator[] {
  const field = FIELD_BY_KEY.get(key);
  return field ? OPERATORS_BY_TYPE[field.type] : [];
}

export interface FlagCondition {
  field: keyof AirportFacts;
  operator: Operator;
  value?: string | number;
}

export interface FlagGroup {
  combine: 'AND' | 'OR';
  conditions: FlagCondition[];
}

export interface FlagRule {
  id: string;
  label: string;
  severity: FlagSeverity;
  /** Empty means every aircraft type. 5,000 ft is not the same fact for a G650ER as a G500. */
  appliesTo: string[];
  showOnPilotWorkspace: boolean;
  group: FlagGroup;
  /** Free text shown to the crew when it matches. */
  guidance?: string;
}

function minOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.min(...present) : null;
}

function maxOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.max(...present) : null;
}

export function airportFacts(airport: AirportRecord): AirportFacts {
  const ends = airport.runways.flatMap((runway) => runway.ends);
  const published = ends.map((end) => end.declaredDistances).filter(Boolean);

  return {
    longestRunwayFt: maxOf(airport.runways.map((r) => r.lengthFt)),
    shortestRunwayFt: minOf(airport.runways.map((r) => r.lengthFt)),
    narrowestRunwayFt: minOf(airport.runways.map((r) => r.widthFt)),
    shortestLdaFt: minOf(published.map((d) => d!.ldaFt)),
    shortestToraFt: minOf(published.map((d) => d!.toraFt)),
    hasDeclaredDistances: published.length > 0,
    hasPavementClassification: airport.runways.some((r) => r.pavement.classification !== null),
    elevationFt: airport.elevationFt,
    surfaces: airport.runways
      .map((r) => r.surfaceTypeCode)
      .filter((s): s is string => Boolean(s)),
    fuelTypes: airport.fuelTypes,
    towerTypeCode: airport.towerTypeCode,
    far139TypeCode: airport.far139TypeCode,
    stateCode: airport.stateCode,
    customsAvailable: airport.customsAvailable,
    landingFee: airport.landingFee,
    hasIcaoId: Boolean(airport.icaoId),
  };
}

function evaluateCondition(condition: FlagCondition, facts: AirportFacts): boolean {
  const fact = facts[condition.field];

  switch (condition.operator) {
    case 'isTrue':
      return fact === true;
    case 'isFalse':
      return fact === false;
    case 'isEmpty':
      return fact === null || fact === undefined || (Array.isArray(fact) && fact.length === 0);
    case 'isNotEmpty':
      return Array.isArray(fact) ? fact.length > 0 : fact !== null && fact !== undefined;
    case 'contains':
      return Array.isArray(fact) && fact.includes(String(condition.value));
    case 'notContains':
      return Array.isArray(fact) && !fact.includes(String(condition.value));
    default:
      break;
  }

  // Numeric comparisons. An unknown fact is UNKNOWN, never zero and never
  // "less than" anything — the FAA leaves most of these fields unpublished, so
  // treating null as 0 would flag thousands of airports for a fact nobody has.
  if (typeof fact !== 'number' || typeof condition.value !== 'number') {
    if (condition.operator === 'eq') return fact === condition.value;
    if (condition.operator === 'neq') return fact !== condition.value;
    return false;
  }

  switch (condition.operator) {
    case 'lt':
      return fact < condition.value;
    case 'lte':
      return fact <= condition.value;
    case 'gt':
      return fact > condition.value;
    case 'gte':
      return fact >= condition.value;
    case 'eq':
      return fact === condition.value;
    case 'neq':
      return fact !== condition.value;
    default:
      return false;
  }
}

/**
 * Whether a rule flags this airport.
 *
 * An empty condition set never matches. A rule that matched everything the moment
 * someone opened the builder and saved without adding a condition would flag all
 * 2,128 airports at once.
 */
export function evaluateAgainstFacts(
  rule: FlagRule,
  facts: AirportFacts,
  aircraftType?: string,
): boolean {
  if (rule.appliesTo.length > 0 && aircraftType && !rule.appliesTo.includes(aircraftType)) {
    return false;
  }
  if (rule.group.conditions.length === 0) return false;

  const results = rule.group.conditions.map((condition) => evaluateCondition(condition, facts));
  return rule.group.combine === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function evaluateRule(
  rule: FlagRule,
  airport: AirportRecord,
  aircraftType?: string,
): boolean {
  return evaluateAgainstFacts(rule, airportFacts(airport), aircraftType);
}

/**
 * How many airports a rule would flag, across the whole set.
 *
 * This is what stops a rule set going bad quietly. Someone writes
 * "longest runway < 6000" meaning a handful of tight fields and never learns it
 * flagged 1,400 airports until crews start ignoring the flags.
 */
export function previewMatches(
  rule: FlagRule,
  factsById: Record<string, AirportFacts>,
  aircraftType?: string,
): { matched: string[]; total: number } {
  const ids = Object.keys(factsById);
  return {
    matched: ids.filter((id) => evaluateAgainstFacts(rule, factsById[id], aircraftType)),
    total: ids.length,
  };
}

/** Rules that flag this airport, worst first. */
export function matchingRules(
  rules: readonly FlagRule[],
  airport: AirportRecord,
  aircraftType?: string,
): FlagRule[] {
  const order: Record<FlagSeverity, number> = { warning: 0, caution: 1, info: 2 };
  return rules
    .filter((rule) => evaluateRule(rule, airport, aircraftType))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}
