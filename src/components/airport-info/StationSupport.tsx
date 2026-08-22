import React, { useState } from 'react';
import { AlertTriangle, Check, Pencil, Wrench } from 'lucide-react';

import { FIELD_LABEL } from '../../airport/company/confirmations';
import { SUPPORT_FIELDS, type SupportField } from '../../airport/company/pageStore';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { useCompanyAirport } from './CompanyAirportContext';
import { ProvenanceChip } from './ProvenanceChip';

/**
 * Station support — what can be done to an aircraft standing at this airport (D96).
 *
 * This is the half of the retired `/airport-services` page that was worth
 * keeping. Its five star ratings are gone: a number cannot say whether anyone
 * here can sign a CRS on a G650ER, and "MRT ★★★★☆" was read by nobody. Each
 * fact is now a sentence with a response time in it, carrying its own
 * confirmation date like every other company-page field.
 *
 * These fields are written DIRECT — a technician saves and it publishes, with no
 * approver in the path (Bryan, 2026-08-22). The store enforces which fields may
 * take that path; see SUPPORT_FIELDS. The five older company-page fields keep
 * their propose/approve/publish route, which means this one card currently
 * carries two rules. That is known and deliberate, not an oversight — it is
 * flagged in D96 for a later call.
 */

const HINTS: Record<SupportField, string> = {
  teamRecommendation: 'One sentence, read first, by everyone. Name the handler and say where maintenance goes.',
  onFieldCapability: 'Can an aircraft be worked where it stands? Name the station and what it is rated for.',
  mobileResponse: 'Who travels to it, from where, and how long that actually takes.',
  localIndependent: 'The "some hands, no CRS" answer. Say plainly what they may not sign.',
  companySupport: 'Our own technicians: based here, or how far away, and what that costs in days.',
  partsAndAog: 'The parts desk that serves this station, and its cut-off.',
  groundKit: 'GPU, air start, hangar, tow — what the ramp can physically give you.',
  stationContacts: 'Who to phone, and which number is the out-of-hours one.',
};

/**
 * The order a technician reads them in: the recommendation first (it is the one
 * everybody reads, so it must be authorable from the same place), then
 * capability, then logistics.
 */
const ORDER: SupportField[] = [
  'teamRecommendation',
  'onFieldCapability',
  'mobileResponse',
  'localIndependent',
  'companySupport',
  'partsAndAog',
  'groundKit',
  'stationContacts',
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * The confirmation caveat sits with the fact it qualifies, never at the top of
 * the card — a warning read once and scrolled past does not travel with the
 * value it is about (D54).
 */
function Freshness({
  by,
  atUtc,
  via,
  overdue,
}: {
  by: string;
  atUtc: string;
  via: string;
  overdue: boolean;
}) {
  return (
    <p className={`mt-1 text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
      {via === 'publish' ? 'Written by' : 'Confirmed by'} {by} {formatDate(atUtc)}
      {overdue ? ' — due for review, verify before you rely on it' : ''}
    </p>
  );
}

function FieldEditor({
  icao,
  field,
  current,
  basedOnVersion,
  savedBy,
  onDone,
}: {
  icao: string;
  field: SupportField;
  current: string | null;
  basedOnVersion: number | undefined;
  savedBy: string;
  onDone: () => void;
}) {
  const company = useCompanyAirport();
  const [value, setValue] = useState(current ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    try {
      company.saveSupportField({
        icao,
        field,
        // An emptied box means "we no longer assert anything here", which is a
        // different claim from a blank one nobody has written yet — but both
        // read as absent, so both are null.
        value: value.trim() ? value.trim() : null,
        savedBy,
        note: note.trim() || undefined,
        basedOnVersion,
      });
      onDone();
    } catch (caught) {
      // Almost always a stale base version: someone else saved while this box
      // was open. Saying so beats a silent overwrite of their words.
      setError(caught instanceof Error ? caught.message : 'Could not save.');
    }
  };

  return (
    <div className="rounded border border-primary/40 bg-muted/30 p-3">
      <p className="mb-1 text-sm font-medium">{FIELD_LABEL[field]}</p>
      <p className="mb-2 text-xs text-muted-foreground">{HINTS[field]}</p>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        placeholder={HINTS[field]}
        aria-label={`${FIELD_LABEL[field]} value`}
      />
      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="mt-2"
        placeholder="How you know — optional, and the bit the next person reads"
        aria-label={`${FIELD_LABEL[field]} note`}
      />
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Saves against your name and restarts this field&rsquo;s review clock.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StationSupportCardProps {
  icao: string;
  currentUserOid: string;
  /** False for a crew view — the facts still show, the pencils do not. */
  editable: boolean;
}

export function StationSupportCard({ icao, currentUserOid, editable }: StationSupportCardProps) {
  const company = useCompanyAirport();
  const [editing, setEditing] = useState<SupportField | null>(null);

  const published = company.getLatest(icao);
  const states = new Map(company.confirmationStates(icao).map((state) => [state.field, state]));

  return (
    <Card className={published ? 'p-6' : 'border-dashed p-6'}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          Station support
        </h2>
        <ProvenanceChip source="company" detail={published ? `v${published.version}` : undefined} />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {editable
          ? 'Written by whoever last checked. A save publishes straight away and restarts that field’s clock — no approval step.'
          : 'Written by maintenance. Shown here so a crew knows what a defect written at this airport will meet.'}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {ORDER.map((field) => {
          // The recommendation reads across the whole card: it is a sentence,
          // not a fact in a column, and it renders full width in the header too.
          const value = published?.content[field] ?? null;
          const state = states.get(field);

          if (editing === field) {
            return (
              <div
                key={field}
                className={field === 'teamRecommendation' ? 'md:col-span-2' : undefined}
              >
              <FieldEditor
                icao={icao}
                field={field}
                current={value}
                basedOnVersion={published?.version}
                savedBy={currentUserOid}
                onDone={() => setEditing(null)}
              />
              </div>
            );
          }

          return (
            <div key={field} className={field === 'teamRecommendation' ? 'md:col-span-2' : undefined}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{FIELD_LABEL[field]}</p>
                {editable ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => setEditing(field)}
                    aria-label={`Edit ${FIELD_LABEL[field]}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {value ? (
                <p className="whitespace-pre-wrap font-medium">{value}</p>
              ) : (
                // Absence is an answer here, and it is never a reassuring one.
                // "Nobody has written this" must not read the same as "fine".
                <p className="text-sm italic text-muted-foreground">
                  Not written. Assume no support until someone checks.
                </p>
              )}
              {state?.lastConfirmed ? (
                <Freshness
                  by={state.lastConfirmed.by}
                  atUtc={state.lastConfirmed.atUtc}
                  via={state.lastConfirmed.via}
                  overdue={state.status === 'overdue'}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * What a crew is told about maintenance here — one strip, not a second copy.
 *
 * It renders the SAME fields the maintenance view edits. Nothing is written
 * twice and nothing is summarised into new prose, so the two views cannot drift
 * apart: whatever a technician saves is what a crew reads.
 */
export function CrewSupportStrip({
  icao,
  onOpenMaintenance,
}: {
  icao: string;
  onOpenMaintenance: () => void;
}) {
  const company = useCompanyAirport();
  const published = company.getLatest(icao);
  const onField = published?.content.onFieldCapability ?? null;
  const mobile = published?.content.mobileResponse ?? null;

  return (
    <Card className="flex flex-wrap items-start justify-between gap-4 border-l-[3px] border-l-[color:var(--gfo-sunrise,#D1AC6B)] p-5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          Maintenance support here
        </p>
        {/* Three states, not two. Browser-verified 2026-08-22: with a mobile
            response written but on-field capability still blank, a two-state
            version headlined "nobody has written what maintenance is available"
            directly above the line somebody had just written. Absence of the
            on-field fact is not absence of the page. */}
        {onField ? (
          <p className="mt-1 font-medium">{onField}</p>
        ) : mobile ? (
          <p className="mt-1 font-medium">
            Nothing recorded about on-field capability. Assume none until it is.
          </p>
        ) : (
          <p className="mt-1 font-medium">
            Nobody has written what maintenance is available at this airport. Assume none.
          </p>
        )}
        {mobile ? <p className="mt-1 text-sm text-muted-foreground">{mobile}</p> : null}
      </div>
      <Button variant="outline" onClick={onOpenMaintenance} className="shrink-0">
        Open maintenance view
      </Button>
    </Card>
  );
}

/**
 * "What we do here" — the team's recommendation, in the header and on every
 * search card, under both lenses (Bryan, 2026-08-22: *"a place that would be in
 * the header when searched like which one the team recommends"*).
 *
 * Same fact for both jobs: it names the handler a crew should book AND where a
 * defect gets worked, which is why it is one field and not two.
 */
export function TeamRecommendation({
  icao,
  compact = false,
}: {
  icao: string;
  compact?: boolean;
}) {
  const company = useCompanyAirport();
  const published = company.getLatest(icao);
  const value = published?.content.teamRecommendation ?? null;
  if (!value) return null;

  const state = company
    .confirmationStates(icao)
    .find((candidate) => candidate.field === 'teamRecommendation');
  const overdue = state?.status === 'overdue';

  return (
    <div
      className={`flex items-start gap-2 rounded border border-amber-200 bg-amber-50 ${
        compact ? 'p-2' : 'p-3'
      }`}
    >
      {overdue ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      )}
      <div className="min-w-0">
        <p className={compact ? 'text-xs text-amber-900' : 'text-sm text-amber-900'}>
          <span className="font-semibold">What we do here — </span>
          {value}
        </p>
        {!compact && state?.lastConfirmed ? (
          <p className={`mt-1 text-xs ${overdue ? 'text-destructive' : 'text-amber-800/80'}`}>
            {state.lastConfirmed.via === 'publish' ? 'Written by' : 'Confirmed by'}{' '}
            {state.lastConfirmed.by} {formatDate(state.lastConfirmed.atUtc)}
            {overdue ? ' — due for review' : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export { ORDER as STATION_SUPPORT_ORDER, SUPPORT_FIELDS };

/**
 * The right-hand fact on a directory card under the maintenance lens — what a
 * technician scans a list for. Falls back to the honest answer rather than a
 * blank: an airport nobody has written up offers no support until proven
 * otherwise.
 */
export function SupportCardFact({ icao }: { icao: string }) {
  const company = useCompanyAirport();
  const published = company.getLatest(icao);
  const onField = published?.content.onFieldCapability ?? null;
  const mobile = published?.content.mobileResponse ?? null;
  const summary = company.confirmationStates(icao);
  const overdue = summary.filter((state) => state.status === 'overdue');

  // Full width beneath the identity, not beside it. Sat in the card's right
  // column it stole enough width to truncate the airport NAME — the one thing a
  // search result must never lose.
  return (
    <div className="mt-2 border-t pt-2">
      {/* Same three states as the crew strip, and for the same reason: a card
          headlined "nothing written" above a line somebody had written is the
          bug this shape exists to prevent. */}
      <p className={`line-clamp-2 text-sm ${onField ? 'font-medium' : 'text-muted-foreground'}`}>
        {onField ?? (mobile ? 'No on-field capability recorded' : 'Nothing written — assume no support')}
      </p>
      {mobile ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{mobile}</p> : null}
      {overdue.length ? (
        <p className="mt-1 text-xs font-medium text-destructive">
          {overdue.length} {overdue.length === 1 ? 'fact' : 'facts'} overdue
        </p>
      ) : null}
    </div>
  );
}
