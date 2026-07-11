// Pure two-way mapping between the legacy bulletins shapes and the unified
// Doc/Revision model, plus the one-time localStorage import. Ack history is the
// one thing this module must never lose — migrate, don't wipe.
import type { Bulletin, BulletinAcknowledgment, BulletinType } from '../../bulletins/types';
import type { Doc, DocRevision, DocAcknowledgment, RevisionStatus } from '../types';
import { mockSha256 } from '../../tech-log/engine/signing';

export function bulletinClassId(t: BulletinType): string {
  return t === 'flight-ops' ? 'flight-ops-bulletin' : 'procedural-bulletin';
}

export function bulletinTypeFor(classId: string): BulletinType {
  return classId === 'flight-ops-bulletin' ? 'flight-ops' : 'procedural';
}

export function isBulletinClass(classId: string): boolean {
  return classId === 'procedural-bulletin' || classId === 'flight-ops-bulletin';
}

/** Stable pseudo-id for legacy author names that don't map to a SYSTEM_USER. */
export function legacyAuthorId(authorName: string): string {
  return `legacy:${authorName}`;
}

/** Render a Doc + revision back into the exact legacy Bulletin shape. */
export function docToBulletin(doc: Doc, rev: DocRevision): Bulletin {
  return {
    id: doc.id,
    bulletinType: bulletinTypeFor(doc.classId),
    title: doc.title,
    content: rev.content,
    category: doc.category,
    roles: doc.roles,
    effectiveDate: rev.effectiveDate,
    ...(rev.expirationDate !== undefined ? { expirationDate: rev.expirationDate } : {}),
    author: rev.authorName,
    createdDate: doc.createdDate,
    ...(rev.lastUpdatedDate !== undefined ? { lastUpdated: rev.lastUpdatedDate } : {}),
    version: rev.revision,
    isPinned: doc.isPinned,
    isArchived: doc.isArchived,
    requireAcknowledgment: rev.requireAcknowledgment,
    tags: doc.tags,
    ...(rev.images !== undefined ? { images: rev.images } : {}),
    ...(rev.videos !== undefined ? { videos: rev.videos } : {}),
    ...(rev.links !== undefined ? { links: rev.links } : {}),
  };
}

/** Map a legacy Bulletin into a Doc + one revision. */
export function bulletinToDocAndRevision(
  b: Bulletin,
  opts: { status?: RevisionStatus; revisionId?: string } = {},
): { doc: Doc; rev: DocRevision } {
  const status = opts.status ?? 'published';
  const doc: Doc = {
    id: b.id,
    classId: bulletinClassId(b.bulletinType),
    title: b.title,
    category: b.category,
    roles: b.roles,
    ownerUserId: legacyAuthorId(b.author),
    ownerName: b.author,
    tags: b.tags,
    isPinned: b.isPinned,
    isArchived: b.isArchived,
    createdDate: b.createdDate,
  };
  const rev: DocRevision = {
    id: opts.revisionId ?? `${b.id}-r1`,
    docId: b.id,
    revision: b.version,
    status,
    content: b.content,
    changeSummary: '',
    effectiveDate: b.effectiveDate,
    ...(b.expirationDate !== undefined ? { expirationDate: b.expirationDate } : {}),
    authorUserId: legacyAuthorId(b.author),
    authorName: b.author,
    requireAcknowledgment: b.requireAcknowledgment,
    ackLevel: b.requireAcknowledgment ? 'initials' : 'none',
    mockChecksum: mockSha256(b.content),
    ...(status === 'published' ? { publishedAtUtc: `${b.effectiveDate}T00:00:00.000Z` } : {}),
    ...(b.lastUpdated !== undefined ? { lastUpdatedDate: b.lastUpdated } : {}),
    ...(b.images !== undefined ? { images: b.images } : {}),
    ...(b.videos !== undefined ? { videos: b.videos } : {}),
    ...(b.links !== undefined ? { links: b.links } : {}),
  };
  return { doc, rev };
}

export function ackToDocAck(a: BulletinAcknowledgment, revisionId: string): DocAcknowledgment {
  return {
    docId: a.bulletinId,
    revisionId,
    revision: a.bulletinVersion,
    userId: a.userId,
    userName: a.userName,
    role: a.role,
    level: 'initials',
    initials: a.initials,
    acknowledgedAtUtc: a.acknowledgedAtUtc,
  };
}

/**
 * One-time import of the legacy 'bulletins-state' localStorage payload.
 * Acks recorded against the bulletin's live version bind to the imported
 * revision; older-version acks are kept as history under a synthetic revision
 * id (they match nothing current, exactly like the legacy re-arm semantics).
 * Returns null when the payload is absent/unreadable.
 */
export function importLegacyBulletins(
  raw: string | null,
): { docs: Doc[]; revisions: DocRevision[]; acknowledgments: DocAcknowledgment[] } | null {
  if (!raw) return null;
  let parsed: { bulletins?: unknown; acknowledgments?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.bulletins)) return null;
  const bulletins = parsed.bulletins as Bulletin[];
  const acks = Array.isArray(parsed.acknowledgments)
    ? (parsed.acknowledgments as BulletinAcknowledgment[])
    : [];

  const docs: Doc[] = [];
  const revisions: DocRevision[] = [];
  for (const b of bulletins) {
    const { doc, rev } = bulletinToDocAndRevision(b);
    docs.push(doc);
    revisions.push(rev);
  }
  const acknowledgments: DocAcknowledgment[] = acks.map((a) => {
    const b = bulletins.find((x) => x.id === a.bulletinId);
    const revisionId =
      b && b.version === a.bulletinVersion
        ? `${a.bulletinId}-r1`
        : `${a.bulletinId}-legacy-${a.bulletinVersion}`;
    return ackToDocAck(a, revisionId);
  });
  return { docs, revisions, acknowledgments };
}
