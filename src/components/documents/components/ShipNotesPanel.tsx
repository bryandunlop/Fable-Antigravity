import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, Info, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoEmptyState } from '../../gfo';
import { CasChip } from '../../tech-log/components/CasChip';
import type { AircraftType } from '../../tech-log/types';
import { useDocuments } from '../DocumentsContext';
import { classFor, docReaderPath, SHIP_NOTE_SECTIONS } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { CAS_KNOWLEDGE_CLASS_ID } from '../engine/casKnowledge';
import { currentRevision } from '../engine/revisions';
import { shipNoteSections, fleetProcedures } from '../engine/shipNotes';
import { NuisanceMessageTable } from './NuisanceMessageTable';
import { DocEditorDialog } from './DocEditorDialog';

/**
 * D64 — **Ship Notes**: what crew and technicians need to know about THIS aircraft.
 *
 * Supersedes the CAS-framed reference panel D60 shipped. Three things changed, all Bryan's calls:
 *
 * 1. **Sections are what you're DOING, not who you are.** D60's panel split CAS entries from
 *    articles — a shape only maintenance could navigate. The headings are now task-shaped
 *    (`SHIP_NOTE_SECTIONS`), so a flight attendant looking for the wifi reset finds it under
 *    "Cabin & connectivity" without knowing what a CAS message is.
 * 2. **Role orders, never filters.** Your sections expand first; every other section stays present
 *    with its count, one click away. D60 built this so a pilot COULD read what maintenance knows,
 *    and a hard filter would undo that.
 * 3. **The name is deliberately informal.** "Quick Reference", "Handbook" and "Guide" were rejected
 *    because QRH, AFM and POH are real approved documents on that flight deck; a tab that borrows
 *    their authority undoes the reference-only labelling this whole surface depends on.
 *
 * **Reference only, and never suppressive.** Nothing here defers, clears or releases anything, and
 * nothing gates the defect path. A defect's own CAS values are captured on the signed defect (D57),
 * never read back from here.
 */
export function ShipNotesPanel({
  fleetType,
  tailNumber,
  userRole,
  additionalRoles = [],
}: {
  fleetType: AircraftType;
  tailNumber: string;
  /** The user's PRIMARY LOGIN role — the same value `/documents` passes (see D60's note: the
   *  tech-log persona is not an authority on document authoring). */
  userRole: string;
  additionalRoles?: string[];
}) {
  const { state } = useDocuments();
  const [creating, setCreating] = useState<'cas' | 'article' | null>(null);
  const userRoles = [userRole, ...additionalRoles].filter(Boolean);
  const curator = canAuthor(classFor(CAS_KNOWLEDGE_CLASS_ID), userRoles);

  const sections = useMemo(
    () => shipNoteSections(state.docs, state.revisions, fleetType, userRoles),
    [state.docs, state.revisions, fleetType, userRoles.join(',')],
  );
  const procedures = useMemo(
    () => fleetProcedures(state.docs, state.revisions, fleetType),
    [state.docs, state.revisions, fleetType],
  );
  const revFor = (docId: string) => currentRevision(docId, state.revisions);
  const total = sections.reduce((n, s) => n + s.docs.length, 0) + procedures.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 md:flex-row md:items-start md:justify-between">
        <p className="flex max-w-2xl items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Reference only.</strong> What the team knows about the {fleetType} — how things
            work, what has been seen before, how to do the everyday jobs. It is <strong>not</strong> an
            airworthiness record and nothing here defers, clears or releases {tailNumber}. Published
            directly by curators, so read it as experience rather than as procedure.
          </span>
        </p>
        {curator && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreating('article')}>
              <Plus className="mr-1.5 h-4 w-4" /> New note
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating('cas')}>
              <Plus className="mr-1.5 h-4 w-4" /> New CAS entry
            </Button>
          </div>
        )}
      </div>

      {total === 0 && (
        <GfoEmptyState
          icon={<Info />}
          message={`Nothing recorded for the ${fleetType} yet.`}
          circle="sunrise"
        />
      )}

      {sections.map((section) => {
        if (section.docs.length === 0) return null;
        return (
          <details
            key={section.category}
            open={section.isMine}
            data-section={section.category}
            data-mine={section.isMine ? 'true' : 'false'}
            className="rounded-md border border-border"
          >
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
              {section.category}
              <span className="ml-1.5 text-muted-foreground">({section.docs.length})</span>
            </summary>
            <ul className="space-y-2 border-t border-border p-3">
              {section.docs.map((doc) => {
                const rev = revFor(doc.id);
                const cas = rev?.casMeta;
                const cmc = rev?.cmcRows;
                return (
                  <li key={doc.id}>
                    {cmc?.length ? (
                      <div className="rounded-md border border-border p-3">
                        <p className="mb-2 text-sm font-medium">{doc.title}</p>
                        <NuisanceMessageTable rows={cmc} fleetType={fleetType} />
                      </div>
                    ) : (
                      <Link
                        to={docReaderPath(doc.id)}
                        className="flex flex-col gap-1.5 rounded-md border border-border p-3 transition-shadow hover:shadow-md md:flex-row md:items-center md:gap-3"
                      >
                        {cas && <CasChip message={cas.casMessage} color={cas.casColor} className="shrink-0" />}
                        <span className="min-w-0 flex-1 text-sm">{doc.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{doc.id}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}

      {procedures.length > 0 && (
        <section aria-labelledby="ship-notes-procedures">
          <h3 id="ship-notes-procedures" className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileCheck2 className="h-4 w-4" /> Procedures ({procedures.length})
          </h3>
          {/* D64's split, made visible. These are performed ON the aircraft (a chart or
              navigation-database load), so they stay in the controlled `sop` class behind
              four-eyes and the shelf links OUT to them. A reader must be able to tell at a glance
              which items carry approval and which are one person's field note — that distinction is
              the whole point of the split, and it has to be on screen, not just in the store. */}
          <ul className="space-y-2">
            {procedures.map((doc) => (
              <li key={doc.id}>
                <Link
                  to={docReaderPath(doc.id)}
                  data-procedure={doc.id}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-sm transition-shadow hover:shadow-md"
                >
                  <span className="min-w-0 flex-1">{doc.title}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">Controlled · approved</Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">{doc.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {creating && (
        <DocEditorDialog
          open
          onOpenChange={(o) => { if (!o) setCreating(null); }}
          mode={{
            kind: 'create',
            classId: CAS_KNOWLEDGE_CLASS_ID,
            prefill:
              creating === 'cas'
                ? {
                    fleetTypes: [fleetType],
                    category: 'Messages & faults',
                    casMeta: { casMessage: '', casColor: 'AMBER' },
                  }
                : { fleetTypes: [fleetType], category: 'Quirks & field notes' },
          }}
          userRole={userRole}
          additionalRoles={additionalRoles}
        />
      )}
    </div>
  );
}

export { SHIP_NOTE_SECTIONS };
