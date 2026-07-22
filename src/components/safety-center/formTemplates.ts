// Persisted form-template store — the single source of truth for what the crew
// intake forms ask (D38 follow-up). The Report dialog RENDERS from these
// templates and the manager's Form setup EDITS them, so a safety-manager change
// is live in the crew form immediately. Seeds reproduce the full intake forms
// the app had before the Safety Center rebuild (HazardReporting, ASAPReport,
// UserSafety's CWS form), not the slimmed quick-report fields.
//
// Well-known field ids (the KNOWN_IDS maps below) are the contract between a
// template and the typed stores (HazardContext, asapReports, cwsRecognitions):
// those ids map onto real store columns; any OTHER field the manager adds is
// preserved as "Label: value" lines appended to the record's description.
// Waiver has no dedicated store — its filed answers are snapshotted onto the
// ApprovalRequest it creates (D39 / approvalRequests.ts), so nothing is dropped.

import { useEffect, useReducer } from 'react';
import type { FormField, FormTemplate } from './types';
import type { Kind } from './ReportDialog';

const KEY = 'sc_form_templates_v1';
// Bumping SEED_VERSION replaces stored templates with the new seeds — demo
// semantics: a seed upgrade wins over saved manager edits. v3 adds the waiver
// approvalChain (D39).
const SEED_VERSION = 3;

export const SEED_TEMPLATES: FormTemplate[] = [
  {
    id: 'tpl-hazard', kind: 'Hazard', name: 'Hazard report', description: 'General safety hazard / unsafe condition.', scored: false,
    fields: [
      { id: 'title', label: 'Title / summary', type: 'text', required: true },
      { id: 'location', label: 'Location', type: 'text', required: true },
      { id: 'category', label: 'Category', type: 'select', required: true, options: ['Flight Operations', 'Ground Operations', 'Maintenance', 'Cabin/Inflight', 'Equipment', 'Airport Infrastructure', 'Weather', 'Wildlife', 'Other'] },
      { id: 'severity', label: 'Initial severity assessment', type: 'radio', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'riskFactors', label: 'Risk factors (the Dirty Dozen)', type: 'multiselect', required: false, options: ['Pressure', 'Lack of Awareness', 'Complacency', 'Lack of Communications', 'Stress', 'Lack of Teamwork', 'Distractions', 'Lack of Knowledge', 'Fatigue', 'Lack of Assertiveness', 'Normalization of Deviance', 'Lack of Resources'] },
      { id: 'description', label: 'Describe the hazard or safety issue you observed', type: 'textarea', required: true },
      { id: 'immediate', label: 'Immediate actions taken (if any)', type: 'textarea', required: false },
      { id: 'corrective', label: 'Suggested corrective action', type: 'textarea', required: false },
      { id: 'consequences', label: 'Potential consequences (if ignored)', type: 'textarea', required: false },
      { id: 'anonymous', label: 'Submit anonymously', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'tpl-asap', kind: 'ASAP', name: 'ASAP report', description: 'Confidential aviation safety action report.', scored: false,
    fields: [
      { id: 'role', label: 'Your role', type: 'select', required: true, options: ['Pilot', 'Flight Attendant', 'Maintenance Technician', 'Dispatcher', 'Ground Crew', 'Air Traffic Control', 'Other'] },
      { id: 'eventDate', label: 'Event date', type: 'date', required: true },
      { id: 'eventTime', label: 'Event time (local)', type: 'text', required: false },
      { id: 'airport', label: 'Location / airport', type: 'text', required: true },
      { id: 'aircraft', label: 'Aircraft type', type: 'text', required: false },
      { id: 'phase', label: 'Flight phase', type: 'select', required: true, options: ['Preflight', 'Taxi', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight'] },
      { id: 'eventTypes', label: 'Event type(s)', type: 'multiselect', required: true, options: ['Aircraft Systems', 'Air Traffic Control', 'Airport Operations', 'Cabin Safety', 'Communication', 'Ground Operations', 'Human Factors', 'Maintenance', 'Meteorology', 'Navigation', 'Runway Incursion', 'Security', 'Weight and Balance', 'Other'] },
      { id: 'severity', label: 'Severity level', type: 'radio', required: true, options: ['Low', 'Medium', 'High'] },
      { id: 'contributingFactors', label: 'Contributing factors', type: 'multiselect', required: false, options: ['Communication Breakdown', 'Distraction/Interruption', 'Fatigue', 'Inadequate Procedures', 'Inadequate Training', 'Physical Environment', 'Pressure (Time/Economic)', 'Stress (Mental/Physical)', 'Technology Issues', 'Weather Conditions', 'Workload Issues', 'Other'] },
      { id: 'description', label: 'Event description', type: 'textarea', required: true },
      { id: 'consequences', label: 'Consequences / outcomes', type: 'textarea', required: false },
      { id: 'recommendations', label: 'Recommended actions', type: 'textarea', required: false },
      { id: 'nasa', label: 'Also file with NASA ASRS', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'tpl-cws', kind: 'CWS', name: 'Caught Working Safely', description: 'Positive-recognition observation.', scored: false,
    fields: [
      { id: 'who', label: 'Person being recognized', type: 'text', required: true },
      { id: 'role', label: 'Their role / department', type: 'select', required: false, options: ['Pilot', 'Inflight Crew', 'Maintenance', 'Safety', 'Scheduling', 'Admin/Support', 'Other'] },
      { id: 'dateObserved', label: 'Date observed', type: 'date', required: false },
      { id: 'location', label: 'Location', type: 'text', required: false },
      { id: 'category', label: 'Category of safe practice', type: 'select', required: false, options: ['PPE Compliance', 'Following Proper Procedures', 'Hazard Identification & Reporting', 'Pre-flight Safety Checks', 'Ground Operations Safety', 'Maintenance Safety Practices', 'Safety Communication', 'Situational Awareness', 'Safety Teamwork & Coordination', 'Other'] },
      { id: 'description', label: 'Description of safe behavior', type: 'textarea', required: true },
      { id: 'why', label: 'Why this matters', type: 'textarea', required: false },
    ],
  },
  {
    id: 'tpl-waiver', kind: 'Waiver', name: 'Waiver request', description: 'Request an exception or extension.', scored: false,
    // Flagship of the D39 routing engine: a filed waiver walks Safety Manager
    // then Chief Pilot, each deciding from their own Approvals inbox.
    approvalChain: ['safety', 'chief-pilot'],
    fields: [
      { id: 'request', label: 'What are you requesting?', type: 'textarea', required: true },
      { id: 'justification', label: 'Reason / justification', type: 'textarea', required: true },
      { id: 'tripDate', label: 'Trip / date', type: 'text', required: false },
    ],
  },
  {
    id: 'tpl-frat', kind: 'FRAT', name: 'Flight Risk Assessment', description: 'Scored pre-flight risk assessment (lives on the trip).', scored: true,
    fields: [
      { id: 'f1', label: 'Crew duty day', type: 'select', required: true, options: ['< 10h', '10–12h', '12–14h', '> 14h'] },
      { id: 'f2', label: 'Weather at destination', type: 'select', required: true, options: ['VMC', 'MVMC', 'IMC', 'Below mins'] },
      { id: 'f3', label: 'Terrain / airport', type: 'select', required: true, options: ['Standard', 'Elevated', 'Special-qual'] },
      { id: 'f4', label: 'Night operation', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'tpl-grat', kind: 'GRAT', name: 'Ground Risk Assessment', description: 'Scored maintenance/ground task assessment.', scored: true,
    fields: [
      { id: 'f1', label: 'Task', type: 'text', required: true },
      { id: 'f2', label: 'Task complexity', type: 'select', required: true, options: ['Routine', 'Non-routine', 'Critical'] },
      { id: 'f3', label: 'Requires RII', type: 'checkbox', required: false },
    ],
  },
];

// ---- store (same idiom as asapReports.ts) --------------------------------

interface Stored { v: number; templates: FormTemplate[] }

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }

function load(): FormTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed.v === SEED_VERSION && Array.isArray(parsed.templates)) return parsed.templates;
    }
  } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify({ v: SEED_VERSION, templates: SEED_TEMPLATES })); } catch { /* ignore */ }
  return SEED_TEMPLATES;
}
function persist(templates: FormTemplate[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: SEED_VERSION, templates })); } catch { /* ignore */ }
}

export function getFormTemplates(): FormTemplate[] { return load(); }

const OPTION_FIELD_TYPES = ['select', 'radio', 'multiselect'];

/** A choice field saved with zero options would make a required field
 *  unsatisfiable and the whole form unsubmittable — restore defaults. */
export function sanitizeTemplate(t: FormTemplate): FormTemplate {
  return {
    ...t,
    fields: t.fields.map((f) =>
      OPTION_FIELD_TYPES.includes(f.type) && !f.options?.length
        ? { ...f, options: ['Option 1', 'Option 2'] }
        : f,
    ),
  };
}

export function saveFormTemplate(t: FormTemplate): FormTemplate {
  const clean = sanitizeTemplate(t);
  persist(load().map((x) => (x.id === clean.id ? clean : x)));
  emit();
  return clean;
}

export function useFormTemplates() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { templates: getFormTemplates(), saveFormTemplate };
}

const KIND_TO_TEMPLATE_ID: Record<Kind, string> = {
  hazard: 'tpl-hazard', asap: 'tpl-asap', cws: 'tpl-cws', waiver: 'tpl-waiver',
};

export function templateForKind(templates: FormTemplate[], kind: Kind): FormTemplate | undefined {
  return templates.find((t) => t.id === KIND_TO_TEMPLATE_ID[kind]);
}

// ---- pure helpers (tested) ------------------------------------------------

/** Multiselect values are stored joined; keep the separator in one place. */
export const MULTI_SEP = '; ';

/** Labels of required fields that are still empty. Empty array = submittable. */
export function missingRequired(template: FormTemplate, values: Record<string, string>): string[] {
  return template.fields
    .filter((f) => f.required && !(values[f.id] || '').trim())
    .map((f) => f.label);
}

/** Field ids that map onto real store columns, per kind. Everything else is an
 *  "extra" and gets appended to the description so manager-added fields are
 *  never silently dropped. */
export const KNOWN_IDS: Record<Kind, string[]> = {
  hazard: ['title', 'location', 'category', 'severity', 'riskFactors', 'description', 'immediate', 'corrective', 'consequences', 'anonymous'],
  asap: ['phase', 'airport', 'severity', 'contributingFactors', 'description'],
  cws: ['who', 'description'],
  waiver: ['request', 'justification', 'tripDate'],
};

export interface ExtraField { label: string; value: string }

/** Values for fields the typed store has no column for, in template order. */
export function extraFields(template: FormTemplate, values: Record<string, string>, knownIds: string[]): ExtraField[] {
  return template.fields
    .filter((f) => !knownIds.includes(f.id))
    .map((f) => ({ label: f.label, value: (values[f.id] || '').trim() }))
    .filter((e) => e.value);
}

/** "Label: value" block for appending extras to a description/prose column. */
export function extraLines(extras: ExtraField[]): string {
  return extras.map((e) => `${e.label}: ${e.value}`).join('\n');
}

/** Description plus any extra-field lines — the standard way a record keeps
 *  manager-added answers. */
export function describeWithExtras(template: FormTemplate, values: Record<string, string>, kind: Kind, base: string): string {
  const extras = extraFields(template, values, KNOWN_IDS[kind]);
  if (!extras.length) return base;
  return base ? `${base}\n\n${extraLines(extras)}` : extraLines(extras);
}
