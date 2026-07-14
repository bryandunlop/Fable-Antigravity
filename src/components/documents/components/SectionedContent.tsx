import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DocSection, DocBlock } from '../types';

const CALLOUT_STYLES: Record<NonNullable<DocBlock['calloutKind']>, string> = {
  // Amber/caution styling stays on document surfaces only — never the RAG status palette.
  note: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30',
  caution: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20',
  warning: 'border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20',
};

export function BlockBody({ block }: { block: DocBlock }) {
  if (block.type === 'callout') {
    const kind = block.calloutKind ?? 'note';
    // Strip the '> [!KIND]' marker line; render the remaining quoted text.
    const body = block.md.replace(/^>\s*\[![^\]]*\]\s*/i, '').replace(/^>\s?/gm, '');
    return (
      <div className={`my-3 rounded-md border p-3 ${CALLOUT_STYLES[kind]}`}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide">{kind}</p>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    );
  }
  if (block.type === 'figure') {
    return (
      <figure className="my-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.md}</ReactMarkdown>
      </figure>
    );
  }
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.md}</ReactMarkdown>;
}

export function SectionedContent({
  sections,
  renderBlockGutter,
}: {
  sections: DocSection[];
  renderBlockGutter?: (blockId: string) => ReactNode;
}) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} data-section-id={section.id}>
          {(section.title || section.number) &&
            (section.level <= 1 ? (
              <h1>{section.number ? `${section.number} ` : ''}{section.title}</h1>
            ) : (
              <h2>{section.number ? `${section.number} ` : ''}{section.title}</h2>
            ))}
          {section.blocks.map((block) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className={renderBlockGutter ? 'group relative pr-10' : undefined}
            >
              <BlockBody block={block} />
              {renderBlockGutter?.(block.id)}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
