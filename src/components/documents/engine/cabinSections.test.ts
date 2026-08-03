import { describe, it, expect } from 'vitest';
import {
  cabinSections, validateCabinSections, docsInCabinSection, applyCabinSections,
  canManageCabinSections,
} from './cabinSections';
import { CABIN_SECTIONS } from '../classes';
import type { Doc, DocumentsState } from '../types';
import { documentsReducer } from '../DocumentsContext';

const doc = (id: string, category: string, classId = 'cabin-knowledge'): Doc => ({
  id, classId, title: id, category, roles: ['inflight'], ownerUserId: 'u', ownerName: 'U',
  tags: [], isPinned: false, isArchived: false, createdDate: '2026-08-03',
});

const state = (docs: Doc[], sections?: string[]): DocumentsState => ({
  docs, revisions: [], acknowledgments: [], comments: [], suggestions: [],
  suggestionReplies: [], reviews: [], signatures: [], cabinSections: sections,
});

describe('cabin sections — editable vocabulary', () => {
  it('falls back to the shipped default until someone edits it', () => {
    expect(cabinSections(state([]))).toEqual([...CABIN_SECTIONS]);
    expect(cabinSections(state([], ['Only one']))).toEqual(['Only one']);
    // An empty array is not a considered choice — treat it as never-edited, not as an empty shelf.
    expect(cabinSections(state([], []))).toEqual([...CABIN_SECTIONS]);
  });

  it('rejects blanks, duplicates and an empty list', () => {
    expect(validateCabinSections(['Bedding', '  ']).ok).toBe(false);
    expect(validateCabinSections(['Bedding', 'bedding']).ok).toBe(false);
    expect(validateCabinSections([]).ok).toBe(false);
    expect(validateCabinSections(['Bedding', 'Galley']).ok).toBe(true);
  });

  it('counts only cabin entries in a section, never another class on the same category name', () => {
    const docs = [doc('CK-1', 'Galley'), doc('TK-1', 'Galley', 'tribal-knowledge')];
    expect(docsInCabinSection(docs, 'Galley').map((d) => d.id)).toEqual(['CK-1']);
  });

  it('carries entries across a rename — the whole reason renames are a first-class op', () => {
    const before = state([doc('CK-1', 'Galley & service'), doc('CK-2', 'Bedding & crew rest')]);
    const after = applyCabinSections(before, ['Bedding & crew rest', 'Galley'], { 'Galley & service': 'Galley' });
    expect(after.docs.find((d) => d.id === 'CK-1')!.category).toBe('Galley');
    expect(after.docs.find((d) => d.id === 'CK-2')!.category).toBe('Bedding & crew rest');
    expect(after.cabinSections).toEqual(['Bedding & crew rest', 'Galley']);
  });

  it('never renames another class riding the same category name', () => {
    const before = state([doc('TK-1', 'Quirks & field notes', 'tribal-knowledge')]);
    const after = applyCabinSections(before, ['Quirks'], { 'Quirks & field notes': 'Quirks' });
    expect(after.docs.find((d) => d.id === 'TK-1')!.category).toBe('Quirks & field notes');
  });

  it('trims on the way in, so " Galley " and "Galley" cannot become two sections', () => {
    expect(applyCabinSections(state([]), [' Galley '], {}).cabinSections).toEqual(['Galley']);
  });

  it('lets Bryan\'s four roles manage the list and nobody else', () => {
    for (const r of ['lead-fa', 'fa-manager', 'scheduling-manager', 'admin']) {
      expect(canManageCabinSections([r]), r).toBe(true);
    }
    // A line FA writes entries but does not reshape the shelf for everyone.
    expect(canManageCabinSections(['inflight'])).toBe(false);
    expect(canManageCabinSections(['maintenance'])).toBe(false);
  });
});

describe('SET_CABIN_SECTIONS — the reducer is the authority, not the dialog', () => {
  const base = state([doc('CK-1', 'Galley & service')], ['Bedding & crew rest', 'Galley & service']);
  const act = (sections: string[], renames: Record<string, string>, actorRoles: string[]) =>
    documentsReducer(base, { type: 'SET_CABIN_SECTIONS', payload: { sections, renames, actorRoles } });

  it('refuses a role outside the manager list', () => {
    expect(act(['Bedding & crew rest'], {}, ['inflight'])).toBe(base);
  });

  it('refuses a delete that would strand entries — no orphaned categories', () => {
    // 'Galley & service' holds CK-1 and is neither kept nor renamed: that is an orphaning delete.
    expect(act(['Bedding & crew rest'], {}, ['fa-manager'])).toBe(base);
  });

  it('allows the same delete once the section is empty', () => {
    const empty = state([], ['Bedding & crew rest', 'Galley & service']);
    const after = documentsReducer(empty, {
      type: 'SET_CABIN_SECTIONS',
      payload: { sections: ['Bedding & crew rest'], renames: {}, actorRoles: ['lead-fa'] },
    });
    expect(after.cabinSections).toEqual(['Bedding & crew rest']);
  });

  it('allows a rename and moves the entries with it', () => {
    const after = act(['Bedding & crew rest', 'Galley'], { 'Galley & service': 'Galley' }, ['scheduling-manager']);
    expect(after.cabinSections).toEqual(['Bedding & crew rest', 'Galley']);
    expect(after.docs.find((d) => d.id === 'CK-1')!.category).toBe('Galley');
  });

  it('refuses an invalid list outright', () => {
    expect(act(['Bedding & crew rest', 'bedding & crew rest'], {}, ['admin'])).toBe(base);
  });
});
