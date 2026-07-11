import { CheckCircle2, CircleDashed } from 'lucide-react';
import type { DocRevision, DocAcknowledgment } from '../types';
import type { Reader } from '../engine/acknowledgments';
import { rosterFor } from '../engine/compliance';
import { identityFor } from '../DocumentsContext';
import { getRoleLabelByValue } from '../../../lib/mockUsers';

/** Per-revision read/outstanding roster ("N/M acknowledged" expanded). */
export function ComplianceRoster({
  rev,
  readers,
  acks,
}: {
  rev: Pick<DocRevision, 'id' | 'revision'>;
  readers: Reader[];
  acks: DocAcknowledgment[];
}) {
  const roster = rosterFor(rev, readers, acks);
  const done = roster.filter((r) => r.ack);
  const outstanding = roster.filter((r) => !r.ack);

  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Acknowledged ({done.length})
        </p>
        {done.length === 0 ? (
          <p className="text-xs text-muted-foreground">No acknowledgments yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {done.map(({ reader, ack }) => (
              <li key={reader.userId + reader.role} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">{ack!.userName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {getRoleLabelByValue(reader.role)} ·{' '}
                  {ack!.level === 'signature' ? 'signed' : ack!.initials} ·{' '}
                  {new Date(ack!.acknowledgedAtUtc).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Outstanding ({outstanding.length})
        </p>
        {outstanding.length === 0 ? (
          <p className="text-xs text-emerald-600">Everyone has acknowledged rev {rev.revision}.</p>
        ) : (
          <ul className="space-y-1.5">
            {outstanding.map(({ reader }) => (
              <li key={reader.userId + reader.role} className="flex items-center gap-2">
                <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{identityFor(reader.role).userName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{getRoleLabelByValue(reader.role)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
