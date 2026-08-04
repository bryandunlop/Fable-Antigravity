import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Film, MessageSquare, Plus, Settings2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { isLiveComment } from '../types';
import type { AircraftType } from '../../tech-log/types';
import { classFor } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { currentRevision } from '../engine/revisions';
import { stepNumbers } from '../engine/blocks';
import { cabinSections, canManageCabinSections } from '../engine/cabinSections';
import { useFleetTypes } from '../../tech-log/TechLogContext';
import { DocEditorDialog } from './DocEditorDialog';
import { CabinSectionsDialog } from './CabinSectionsDialog';
import { ReviewFlagBadge } from './ReviewFlagBadge';
import { operatorTodayIso } from '../../../lib/operatorDate';

export const CABIN_KNOWLEDGE_CLASS_ID = 'cabin-knowledge';

/**
 * D75 — the flight attendants' shelf. Cabin know-how, grouped by what you are doing and filtered
 * by fleet type, because "how the bedding goes together" is a different answer on a G500 than on a
 * G650ER and a crew member should never have to work out which entry is theirs.
 *
 * Reading is open — a pilot asked to reset the cabin wifi at 0200 should find this. Authoring is
 * the class's own gate (`authorRoles`), and publishing is four-eyes through the FA manager.
 */
export function CabinKnowledgePanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [creating, setCreating] = useState(false);
  const [editingSections, setEditingSections] = useState(false);
  const [fleet, setFleet] = useState<AircraftType | 'all'>('all');
  // LG-183 — both lists are now live: the fleet filter derives from the tails on file, the
  // sections from editable state. Neither is restated here.
  const FLEET_TYPES = useFleetTypes();
  const todayIso = operatorTodayIso();
  const cfg = classFor(CABIN_KNOWLEDGE_CLASS_ID);
  const userRoles = [userRole, ...additionalRoles];
  const author = canAuthor(cfg, userRoles);
  const sectionManager = canManageCabinSections(userRoles);

  const entries = state.docs
    .filter((d) => d.classId === CABIN_KNOWLEDGE_CLASS_ID && !d.isArchived)
    .map((doc) => ({ doc, rev: currentRevision(doc.id, state.revisions) }))
    // Only published entries appear on the shelf. `currentRevision` is the gate — a draft has no
    // current revision, so an unapproved entry is unreachable rather than filtered out (D65).
    .filter((e): e is { doc: typeof e.doc; rev: NonNullable<typeof e.rev> } => !!e.rev)
    .filter((e) => fleet === 'all' || (e.rev.fleetTypes ?? []).includes(fleet));

  const sections = cabinSections(state).map((section) => ({
    section,
    items: entries.filter((e) => e.doc.category === section),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          How the cabin actually works, per aircraft — bedding, lighting, connectivity, the galley
          and the quirks nobody writes down. Flight attendants write it; the cabin services manager
          publishes it.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {sectionManager && (
            <Button size="sm" variant="outline" onClick={() => setEditingSections(true)}>
              <Settings2 className="mr-1.5 h-4 w-4" /> Sections
            </Button>
          )}
          {author && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New entry
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={fleet === 'all' ? 'secondary' : 'ghost'} onClick={() => setFleet('all')}>
          All aircraft
        </Button>
        {FLEET_TYPES.map((t) => (
          <Button key={t} size="sm" variant={fleet === t ? 'secondary' : 'ghost'} onClick={() => setFleet(t)}>
            {t}
          </Button>
        ))}
      </div>

      {sections.length === 0 ? (
        <GfoEmptyState
          icon={<BedDouble />}
          message={fleet === 'all' ? 'No cabin knowledge entries yet.' : `Nothing written for the ${fleet} yet.`}
          circle="sunrise"
        />
      ) : (
        sections.map(({ section, items }) => (
          <div key={section} className="space-y-2">
            <p className="text-sm font-semibold text-primary">{section}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map(({ doc, rev }) => {
                const comments = state.comments.filter((c) => c.docId === doc.id && isLiveComment(c)).length;
                const steps = stepNumbers(rev.sections.flatMap((s) => s.blocks)).size;
                return (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {(rev.fleetTypes ?? []).join(' · ') || 'All aircraft'} · {doc.id}
                        </p>
                      </div>
                      <ReviewFlagBadge doc={doc} todayIso={todayIso} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {steps > 0 && <Badge variant="secondary" className="px-1.5 text-[10px] font-normal">{steps} steps</Badge>}
                      {!!rev.videos?.length && (
                        <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" /> video</span>
                      )}
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {comments}</span>
                      <span>updated {rev.effectiveDate}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}

      <CabinSectionsDialog open={editingSections} onOpenChange={setEditingSections} actorRoles={userRoles} />

      <DocEditorDialog
        open={creating}
        onOpenChange={setCreating}
        mode={{ kind: 'create', classId: CABIN_KNOWLEDGE_CLASS_ID }}
        userRole={userRole}
        additionalRoles={additionalRoles}
      />
    </div>
  );
}
