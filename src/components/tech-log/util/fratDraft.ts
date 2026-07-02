// FRAT draft <-> form-section conversion. The draft stores only a boolean selection
// matrix (section x item, in template order); scores and labels always come from the
// live FRAT template so a template edit can't resurrect stale scoring from a draft.

interface SelectableItem {
  selected: boolean;
}

export function mergeFratSelections<S extends { items: SelectableItem[] }>(
  sections: S[],
  selections?: boolean[][],
): S[] {
  if (!selections) return sections;
  return sections.map((section, i) => ({
    ...section,
    items: section.items.map((item, j) => ({ ...item, selected: selections[i]?.[j] ?? item.selected })),
  }));
}

export function extractFratSelections(sections: { items: SelectableItem[] }[]): boolean[][] {
  return sections.map((s) => s.items.map((i) => i.selected));
}
