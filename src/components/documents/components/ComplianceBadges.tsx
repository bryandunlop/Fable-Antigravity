import { ShieldCheck } from 'lucide-react';
import { regById } from '../engine/regCatalog';

// Indigo = regulatory-compliance mapping. Distinct from RAG (green/yellow/red),
// amber (change bars), sky (suggestions) and custody (gold/blue).
export function ComplianceBadges({ refs }: { refs?: string[] }) {
  if (!refs?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {refs.map((id) => {
        const r = regById(id);
        if (!r) return null;
        return (
          <span
            key={id}
            title={`${r.authority} · ${r.title}`}
            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <ShieldCheck className="h-3 w-3" />{r.ref}
          </span>
        );
      })}
    </div>
  );
}
