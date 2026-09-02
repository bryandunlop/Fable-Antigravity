import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExternalLink, RefreshCw, Send, AlertTriangle, Code2 } from 'lucide-react';
import { feedbackStore, useFeedbackReports } from './feedbackStore';
import { fileReport, refreshReport } from './feedbackSync';
import { jiraClient, jiraConfig } from './feedbackJira';
import { feedbackToJiraRequest } from './jira/mapping';
import { formatBytes } from './attachments';
import { FEEDBACK_IMPACTS, FEEDBACK_KINDS, type FeedbackKind, type FeedbackReport } from './types';

/** One word, from the same table the dialog's buttons read — they cannot drift. */
const KIND_LABEL = Object.fromEntries(
  FEEDBACK_KINDS.map((k) => [k.kind, k.short]),
) as Record<FeedbackKind, string>;

type Filter = 'all' | 'unfiled' | 'filed' | 'failed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'unfiled', label: 'Needs triage' },
  { id: 'filed', label: 'In Jira' },
  { id: 'failed', label: 'Failed to file' },
];

function matches(report: FeedbackReport, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unfiled') return report.sync === 'local' || report.sync === 'sending';
  if (filter === 'filed') return report.sync === 'filed';
  return report.sync === 'failed';
}

function relative(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * The triage board. Two audiences share it on purpose: a reporter comes to see
 * what happened to their report, and whoever triages comes to move it into Jira.
 * Splitting them would mean a reporter never finds out, which is how in-app
 * feedback channels die.
 */
export function FeedbackPage() {
  const reports = useFeedbackReports();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState(false);

  const visible = useMemo(() => reports.filter((r) => matches(r, filter)), [reports, filter]);
  const selected = reports.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  async function send(report: FeedbackReport) {
    setBusyId(report.id);
    feedbackStore.update(report.id, { sync: 'sending', syncError: undefined });
    const patch = await fileReport(report, jiraClient, jiraConfig);
    feedbackStore.update(report.id, patch);
    setBusyId(null);
  }

  async function refresh(report: FeedbackReport) {
    setBusyId(report.id);
    feedbackStore.update(report.id, await refreshReport(report, jiraClient));
    setBusyId(null);
  }

  const needsTriage = reports.filter((r) => r.sync === 'local').length;

  return (
    <div className="max-w-[1180px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div>
          <h1 className="gfo-h1">Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-[62ch]">
            Everything anyone has reported about myGFO itself. Triage turns a report into a tracked
            issue in Jira; the reporter sees its number and status here without needing a Jira account.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-5 mb-4">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? 'default' : 'outline'}
            onClick={() => setFilter(f.id)}
            className="rounded-full"
          >
            {f.label}
            {f.id === 'unfiled' && needsTriage > 0 && (
              <span className="ml-1.5 text-[11px] opacity-70">{needsTriage}</span>
            )}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-2">
          {visible.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Nothing here.
            </div>
          )}
          {visible.map((report) => {
            const active = selected?.id === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedId(report.id)}
                className={`text-left border rounded-lg p-3.5 flex gap-3 items-start transition-colors ${
                  active ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold leading-snug">{report.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{KIND_LABEL[report.kind]}</span>
                    <span aria-hidden>·</span>
                    <span>{report.area}</span>
                    <span aria-hidden>·</span>
                    <span>{report.reporter}</span>
                    <span aria-hidden>·</span>
                    <span>{relative(report.submittedAt)}</span>
                  </div>
                </div>
                <SyncBadge report={report} />
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="border border-border rounded-lg p-5 h-fit lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {selected.id} · {KIND_LABEL[selected.kind]}
                </div>
                <h2 className="text-[17px] font-semibold leading-snug mt-1">{selected.title}</h2>
              </div>
              <SyncBadge report={selected} />
            </div>

            <p className="text-[13.5px] leading-relaxed mt-3 whitespace-pre-line">{selected.detail}</p>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-[12.5px]">
              <Row label="Impact">
                {FEEDBACK_IMPACTS.find((i) => i.impact === selected.impact)?.label ?? selected.impact}
              </Row>
              <Row label="Area">{selected.area}</Row>
              <Row label="Reported by">{selected.reporter}</Row>
              <Row label="When">{relative(selected.submittedAt)}</Row>
              {selected.shareContext ? (
                <>
                  <Row label="Screen">
                    {selected.context.screen} ({selected.context.route})
                  </Row>
                  <Row label="Role">{selected.context.role}</Row>
                  <Row label="Viewport">{selected.context.viewport}</Row>
                  <Row label="Version">{selected.context.appVersion}</Row>
                </>
              ) : (
                <Row label="Context">Not shared by the reporter</Row>
              )}
            </dl>

            {selected.attachments.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Screenshots
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {selected.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`${a.name} · ${formatBytes(a.size)}${a.jiraAttachmentId ? ' · in Jira' : ''}`}
                    >
                      <img
                        src={a.dataUrl}
                        alt={a.name}
                        className="w-[92px] h-[66px] object-cover rounded-md border border-border hover:border-accent transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selected.attachmentError && (
              <div className="mt-3 rounded-md px-3 py-2.5 text-[12.5px] leading-snug flex gap-2 items-start border border-border">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{selected.attachmentError}</span>
              </div>
            )}

            {selected.jira && (
              <div className="mt-4 rounded-md border border-border px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{selected.jira.key}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {selected.jira.status} · read {relative(selected.jira.syncedAt)}
                  </div>
                </div>
                <a
                  href={selected.jira.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12.5px] inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline shrink-0"
                >
                  Open in Jira <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {selected.syncError && (
              <div className="mt-3 rounded-md px-3 py-2.5 text-[12.5px] leading-snug flex gap-2 items-start border border-[color:var(--gfo-error)]/40">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[color:var(--gfo-error)]" />
                <span>
                  {selected.syncError.message}
                  {!selected.syncError.retryable && (
                    <b className="block font-medium mt-0.5">
                      Retrying will not help — the payload or the credentials need fixing.
                    </b>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {!selected.jira && (
                <Button
                  size="sm"
                  onClick={() => send(selected)}
                  disabled={busyId === selected.id || selected.sync === 'sending'}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {selected.sync === 'failed' ? 'Try filing again' : 'File in Jira'}
                </Button>
              )}
              {selected.jira && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refresh(selected)}
                  disabled={busyId === selected.id}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${busyId === selected.id ? 'animate-spin' : ''}`} />
                  Refresh status
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowPayload((v) => !v)}>
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                {showPayload ? 'Hide' : 'Show'} Jira payload
              </Button>
            </div>

            {showPayload && (
              <div className="mt-3">
                <p className="text-[12px] text-muted-foreground mb-1.5">
                  Exactly what is sent to <code>POST {jiraConfig.apiBaseUrl}/rest/api/3/issue</code>.
                  Generated by the same function the send path uses.
                </p>
                <pre className="text-[11.5px] leading-relaxed bg-muted rounded-md p-3 overflow-x-auto max-h-[320px]">
                  {JSON.stringify(feedbackToJiraRequest(selected, jiraConfig), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function SyncBadge({ report }: { report: FeedbackReport }) {
  if (report.sync === 'filed' && report.jira) {
    return <Badge variant="outline" className="shrink-0">{report.jira.status}</Badge>;
  }
  if (report.sync === 'sending') return <Badge variant="outline" className="shrink-0">Sending…</Badge>;
  if (report.sync === 'failed') return <Badge variant="destructive" className="shrink-0">Failed</Badge>;
  return <Badge variant="secondary" className="shrink-0">Needs triage</Badge>;
}


