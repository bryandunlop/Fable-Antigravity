// Shared domain types for the bulletins module (Procedural + Flight Operations).

export type BulletinType = 'procedural' | 'flight-ops';

export interface BulletinImage {
  url: string;
  caption?: string;
}

export interface BulletinVideo {
  url: string;
  title?: string;
  platform?: 'youtube' | 'vimeo' | 'other';
}

export interface BulletinLink {
  url: string;
  title: string;
}

export interface Bulletin {
  id: string;
  bulletinType: BulletinType;
  title: string;
  content: string;
  category: string;
  roles: string[];
  effectiveDate: string;
  expirationDate?: string;
  author: string;
  createdDate: string;
  lastUpdated?: string;
  version: string;
  isPinned: boolean;
  isArchived: boolean;
  /** When true, target-role readers must Read-and-Initial the current version. */
  requireAcknowledgment: boolean;
  tags: string[];
  images?: BulletinImage[];
  videos?: BulletinVideo[];
  links?: BulletinLink[];
}

/** A point-in-time read-and-initial record. Version-scoped: re-issuing a bulletin
 * at a new `version` re-arms the requirement (a prior-version ack no longer counts). */
export interface BulletinAcknowledgment {
  bulletinId: string;
  bulletinVersion: string;
  userId: string;
  userName: string;
  role: string;
  initials: string;
  acknowledgedAtUtc: string;
}

export interface BulletinsState {
  bulletins: Bulletin[];
  acknowledgments: BulletinAcknowledgment[];
}
