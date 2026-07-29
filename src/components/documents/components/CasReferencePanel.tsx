import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Info, Lightbulb, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoEmptyState } from '../../gfo';
import { CasChip } from '../../tech-log/components/CasChip';
import type { AircraftType } from '../../tech-log/types';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { casCatalog, fleetArticles } from '../engine/casKnowledge';
import { CAS_KNOWLEDGE_CLASS_ID } from '../engine/casKnowledge';
import { DocEditorDialog } from './DocEditorDialog';

/**
 * D60 — the fleet's curated CAS knowledge, filtered to one aircraft type.
 *
 * Hosted on the tail page (`tech-log/pages/AircraftDetail`) so a pilot standing at an aircraft is
 * one tab from "what does this message mean on THIS fleet", and reused nowhere else yet.
 *
 * WHY THIS COMPONENT LIVES IN THE DOCUMENTS MODULE. The knowledge, its store, its curator gate and
 * its reader route are all here; only the mounting point is in tech-log. Importing `CasChip` the
 * other way extends an edge that already exists (documents → tech-log: types, two pure helpers, and
 * `AckPanel` importing a tech-log component). `CasChip` itself pulls in a type and a class-name
 * helper — no context, no store, no router — so there is no cycle at the file level.
 *
 * **Reference only.** This is deliberately labelled as such on screen: tribal knowledge sits
 * ADJACENT to airworthiness records and is never part of one. Nothing on this panel defers, clears
 * or releases anything, and the CAS values a defect carries are captured on the signed defect (D57),
 * not read back from here.
 */
export function CasReferencePanel({
  fleetType,
  tailNumber,
  userRole,
  additionalRoles = [],
}: {
  fleetType: AircraftType;
  tailNumber: string;
  /** A documents-vocabulary role (see `documentsRolesForUserId` for the tech-log bridge). */
  userRole: string;
  additionalRoles?: string[];
}) {
  const { state } = useDocuments();
  const [creating, setCreating] = useState<'cas' | 'article' | null>(null);
  const userRoles = [userRole, ...additionalRoles];
  // The class's EXISTING curator gate, unchanged. Note the reducer's PUBLISH_DIRECT takes no roles,
  // so any creation path must carry this check itself — here the create dialog's CREATE_DOC is the
  // gate, and this only decides whether the affordance is offered at all.
  const curator = canAuthor(classFor(CAS_KNOWLEDGE_CLASS_ID), userRoles);

  const entries = useMemo(() => casCatalog(state.docs, state.revisions, fleetType), [state.docs, state.revisions, fleetType]);
  const articles = useMemo(() => fleetArticles(state.docs, state.revisions, fleetType), [state.docs, state.revisions, fleetType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 md:flex-row md:items-start md:justify-between">
        <p className="flex max-w-2xl items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Reference only.</strong> Curated {fleetType} field knowledge — what a CAS message
            means, how it behaves, what has been seen before. It is <strong>not</strong> an
            airworthiness record and nothing here defers, clears or releases {tailNumber}. Published
            directly by curators, so read it as experience rather than as procedure.
          </span>
        </p>
        {curator && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreating('cas')}>
              <Plus className="mr-1.5 h-4 w-4" /> New CAS entry
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating('article')}>
              <Plus className="mr-1.5 h-4 w-4" /> New article
            </Button>
          </div>
        )}
      </div>

      <section aria-labelledby="cas-entries-heading">
        <h3 id="cas-entries-heading" className="mb-2 flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4" /> CAS messages — {fleetType} ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <GfoEmptyState
            icon={<BookOpen />}
            message={`No CAS entries curated for the ${fleetType} yet.`}
            circle="sunrise"
          />
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.docId}>
                <Link
                  to={`/documents/${e.docId}`}
                  className="flex flex-col gap-1.5 rounded-md border border-border p-3 transition-shadow hover:shadow-md md:flex-row md:items-center md:gap-3"
                >
                  <CasChip message={e.casMessage} color={e.casColor} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-sm">{e.title}</span>
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {e.cmcCodes.map((c) => (
                      <Badge key={c} variant="outline" className="font-mono text-[10px]">
                        {c}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground">{e.docId}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cas-articles-heading">
        <h3 id="cas-articles-heading" className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4" /> {fleetType} reference articles ({articles.length})
        </h3>
        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {fleetType} articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/documents/${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm transition-shadow hover:shadow-md"
                >
                  <span className="min-w-0">{d.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{d.category} · {d.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating && (
        <DocEditorDialog
          open
          onOpenChange={(o) => { if (!o) setCreating(null); }}
          mode={{
            kind: 'create',
            classId: CAS_KNOWLEDGE_CLASS_ID,
            // Seed the fleet the curator is standing on; the dialog can still widen it.
            prefill:
              creating === 'cas'
                ? { fleetTypes: [fleetType], casMeta: { casMessage: '', casColor: 'AMBER' } }
                : { fleetTypes: [fleetType] },
          }}
          userRole={userRole}
          additionalRoles={additionalRoles}
        />
      )}
    </div>
  );
}
