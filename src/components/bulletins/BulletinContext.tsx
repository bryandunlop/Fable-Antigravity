import React, { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import type { Bulletin, BulletinAcknowledgment, BulletinsState } from './types';
import { useDocuments } from '../documents/DocumentsContext';
import { docToBulletin, isBulletinClass } from '../documents/engine/bulletinCompat';
import { currentRevision } from '../documents/engine/revisions';

// COMPATIBILITY ADAPTER — the bulletins store now lives in the unified
// documents engine (documents/DocumentsContext). This context derives the
// legacy BulletinsState shape from documents of the two bulletin classes so
// BulletinsPage renders unchanged. Legacy 'bulletins-state' localStorage is no
// longer written; it was imported once by the documents store (bulletinCompat).
// Authoring goes through the shared four-eyes flow (DocEditorDialog), so the
// legacy add/update/delete writes are gone from this interface.

export const LEGACY_STORAGE_KEY = 'bulletins-state';

interface Ctx {
  state: BulletinsState;
  togglePin: (id: string, actorRoles: string[]) => void;
  toggleArchive: (id: string, actorRoles: string[]) => void;
  /** Record a Read-and-Initial for the current user (resolved from their login role). */
  acknowledge: (bulletin: Pick<Bulletin, 'id' | 'version'>, initials: string, userRole: string) => void;
}

const BulletinContext = createContext<Ctx | undefined>(undefined);

export function BulletinProvider({ children }: { children: ReactNode }) {
  const docsCtx = useDocuments();
  const { state: docState } = docsCtx;

  const state: BulletinsState = useMemo(() => {
    const bulletins: Bulletin[] = [];
    for (const doc of docState.docs) {
      if (!isBulletinClass(doc.classId)) continue;
      const rev = currentRevision(doc.id, docState.revisions);
      if (!rev) continue; // drafts/pending have no published face on the legacy surface
      bulletins.push(docToBulletin(doc, rev));
    }
    const acknowledgments: BulletinAcknowledgment[] = docState.acknowledgments
      .filter((a) => bulletins.some((b) => b.id === a.docId))
      .map((a) => ({
        bulletinId: a.docId,
        bulletinVersion: a.revision,
        userId: a.userId,
        userName: a.userName,
        role: a.role,
        initials: a.initials ?? 'SIG',
        acknowledgedAtUtc: a.acknowledgedAtUtc,
      }));
    return { bulletins, acknowledgments };
  }, [docState.docs, docState.revisions, docState.acknowledgments]);

  const acknowledge = useCallback<Ctx['acknowledge']>(
    (bulletin, initials, userRole) => {
      const doc = docState.docs.find((d) => d.id === bulletin.id);
      const rev = doc ? currentRevision(doc.id, docState.revisions) : undefined;
      if (!doc || !rev) return;
      docsCtx.acknowledgeInitials(doc, rev, initials, userRole);
    },
    [docsCtx, docState.docs, docState.revisions],
  );

  const value: Ctx = {
    state,
    togglePin: docsCtx.togglePin,
    toggleArchive: docsCtx.toggleArchive,
    acknowledge,
  };

  return <BulletinContext.Provider value={value}>{children}</BulletinContext.Provider>;
}

export function useBulletins(): Ctx {
  const c = useContext(BulletinContext);
  if (!c) throw new Error('useBulletins must be used within BulletinProvider');
  return c;
}
