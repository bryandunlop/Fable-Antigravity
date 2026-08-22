import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { DocSection } from '../types';
import { BlockEditRow } from './BlockEditRow';
import {
  editBlockMd, addBlockAfter, deleteBlock, moveBlock, splitBlock, mergeBlockUp,
  addSection, moveSection, setSectionHeading, deleteSection, setBlockComplianceRefs,
} from '../engine/blockEditor';

/** Structured, ID-preserving content editor. Controlled: mutates via the pure
 * blockEditor ops and emits the new tree through onChange. */
export function SectionedEditor({ sections, onChange }: { sections: DocSection[]; onChange: (next: DocSection[]) => void }) {
  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={section.id} data-section-id={section.id} className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={section.number}
              onChange={(e) => onChange(setSectionHeading(sections, section.id, e.target.value, section.title))}
              placeholder="No."
              className="h-8 w-16 text-sm"
              aria-label={`Section ${si + 1} number`}
            />
            <Input
              value={section.title}
              onChange={(e) => onChange(setSectionHeading(sections, section.id, section.number, e.target.value))}
              placeholder="Section title"
              className="h-8 flex-1 text-sm font-medium"
              aria-label={`Section ${si + 1} title`}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move section up" disabled={si === 0} onClick={() => onChange(moveSection(sections, section.id, 'up'))}><ChevronUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move section down" disabled={si === sections.length - 1} onClick={() => onChange(moveSection(sections, section.id, 'down'))}><ChevronDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete section" disabled={sections.length <= 1} onClick={() => onChange(deleteSection(sections, section.id))}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {section.blocks.map((block, bi) => (
              <BlockEditRow
                key={block.id}
                block={block}
                index={bi}
                canMergeUp={bi > 0}
                canMoveUp={bi > 0}
                canMoveDown={bi < section.blocks.length - 1}
                onEditMd={(md) => onChange(editBlockMd(sections, block.id, md))}
                onSplit={(caret, rest) => onChange(splitBlock(sections, block.id, caret, rest))}
                onMergeUp={() => onChange(mergeBlockUp(sections, block.id))}
                onMove={(dir) => onChange(moveBlock(sections, block.id, dir))}
                onAddAfter={() => onChange(addBlockAfter(sections, block.id))}
                onDelete={() => onChange(deleteBlock(sections, block.id))}
                onSetRefs={(refs) => onChange(setBlockComplianceRefs(sections, block.id, refs))}
              />
            ))}
          </div>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => onChange(addSection(sections, section.id))}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add section below
          </Button>
        </div>
      ))}
    </div>
  );
}
