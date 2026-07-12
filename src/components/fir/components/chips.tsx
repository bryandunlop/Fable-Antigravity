import { Badge } from '../../ui/badge';
import type { FirCategory, FirStatus } from '../types';

/** Workflow-status styling stays on quiet Badge variants — the green/amber/red
 * RAG palette is reserved for aircraft serviceability and must not be reused here. */
const STATUS_VARIANT: Record<FirStatus, 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  IN_REVIEW: 'secondary',
  PUBLISHED: 'outline',
  CLOSED_INTERNAL: 'outline',
};

export const STATUS_LABEL: Record<FirStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  PUBLISHED: 'Published',
  CLOSED_INTERNAL: 'Closed internal',
};

export const CATEGORY_LABEL: Record<FirCategory, string> = {
  AOG: 'AOG',
  DELAY: 'Delay',
  DIVERSION: 'Diversion',
  DAMAGE: 'Damage',
  SERVICE: 'Service',
  OTHER: 'Other',
};

export function FirStatusChip({ status }: { status: FirStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={status === 'CLOSED_INTERNAL' ? 'text-muted-foreground' : undefined}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function FirCategoryChip({ category }: { category: FirCategory }) {
  return <Badge variant="outline">{CATEGORY_LABEL[category]}</Badge>;
}
