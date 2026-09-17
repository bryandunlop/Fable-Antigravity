// Where the confirmation email's words live.
//
// The same split the passenger briefing email uses: the TEMPLATE is a setting scheduling
// edits once and every receipt renders from, while each receipt itself is frozen onto the
// submission it belongs to. Editing here changes the next passenger's mail, never one
// already issued.
//
// Persisted rather than held in PassengerFormContext state on purpose — the context is
// demo data that resets on reload, and wording someone took the trouble to rewrite should
// still be there in the morning. Same store idiom as safety-center/formTemplates.ts.

import { useEffect, useReducer } from 'react';
import { DEFAULT_RECEIPT_TEMPLATE, type ReceiptTemplate } from './engine/formReceiptEmail';

const KEY = 'pax_form_receipt_template_v1';
// Bumping this replaces a stored template with the new default — demo semantics, as in the
// safety-center store: a seed upgrade wins over saved edits.
const SEED_VERSION = 1;

interface Stored { v: number; template: ReceiptTemplate }

type Listener = () => void;
let listeners: Listener[] = [];
const emit = () => listeners.forEach((l) => l());

function load(): ReceiptTemplate {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (parsed.v === SEED_VERSION && parsed.template?.blocks?.length) return parsed.template;
    }
  } catch { /* ignore — a corrupt or unavailable store falls back to the default */ }
  return DEFAULT_RECEIPT_TEMPLATE;
}

export function getReceiptTemplate(): ReceiptTemplate { return load(); }

export function saveReceiptTemplate(template: ReceiptTemplate): ReceiptTemplate {
  try { localStorage.setItem(KEY, JSON.stringify({ v: SEED_VERSION, template })); } catch { /* ignore */ }
  emit();
  return template;
}

export function resetReceiptTemplate(): ReceiptTemplate {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  emit();
  return DEFAULT_RECEIPT_TEMPLATE;
}

export function useReceiptTemplate() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { template: getReceiptTemplate(), saveReceiptTemplate, resetReceiptTemplate };
}
