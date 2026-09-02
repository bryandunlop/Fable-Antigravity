import { describe, it, expect } from 'vitest';
import { feedbackToJiraRequest, feedbackLabels, toLabel } from './mapping';
import { DEMO_JIRA_CONFIG } from './config';
import { adfToPlainText } from './adf';
import type { FeedbackReport } from '../types';

const report: FeedbackReport = {
  id: 'FB-2026-004',
  kind: 'bug',
  title: 'Defect list shows yesterday’s deferrals',
  detail: 'Opened Tech Log after a sync and the deferral list was stale.\nPulling to refresh fixed it.',
  impact: 'painful',
  area: 'Tech Log',
  reporter: 'A. Reporter',
  submittedAt: '2026-09-01T12:00:00.000Z',
  shareContext: true,
  context: {
    route: '/tech-log/defects',
    screen: 'Tech Log',
    role: 'pilot',
    appVersion: '2026.9.1',
    viewport: '1180x820',
    userAgent: 'TestAgent/1.0',
  },
  attachments: [],
  sync: 'local',
};

describe('toLabel', () => {
  it('slugs spaces and punctuation Jira would reject', () => {
    expect(toLabel('area', 'Tech Log')).toBe('area-tech-log');
    expect(toLabel('area', 'Flight Ops / Trips')).toBe('area-flight-ops-trips');
  });

  it('never emits a bare prefix for an empty value', () => {
    expect(toLabel('area', '  ')).toBe('area-unknown');
  });
});

describe('feedbackToJiraRequest', () => {
  it('maps kind to the configured Jira issue type', () => {
    expect(feedbackToJiraRequest(report, DEMO_JIRA_CONFIG).fields.issuetype).toEqual({ name: 'Bug' });
    expect(
      feedbackToJiraRequest({ ...report, kind: 'idea' }, DEMO_JIRA_CONFIG).fields.issuetype,
    ).toEqual({ name: 'Story' });
  });

  it('files into the configured project with the base labels plus facets', () => {
    const req = feedbackToJiraRequest(report, DEMO_JIRA_CONFIG);
    expect(req.fields.project).toEqual({ key: 'MYGFO' });
    expect(req.fields.labels).toEqual([
      'mygfo',
      'in-app-report',
      'kind-bug',
      'impact-painful',
      'area-tech-log',
    ]);
  });

  it('emits no label containing a space', () => {
    for (const label of feedbackLabels({ ...report, area: 'Flight Ops' }, DEMO_JIRA_CONFIG)) {
      expect(label).not.toMatch(/\s/);
    }
  });

  it('sends the description as an ADF document, not a string', () => {
    const description = feedbackToJiraRequest(report, DEMO_JIRA_CONFIG).fields.description;
    expect(description.type).toBe('doc');
    expect(description.version).toBe(1);
    expect(adfToPlainText(description)).toContain('Opened Tech Log after a sync');
    expect(adfToPlainText(description)).toContain('Screen: Tech Log (/tech-log/defects)');
  });

  it('withholds the captured context when the reporter opted out', () => {
    const text = adfToPlainText(
      feedbackToJiraRequest({ ...report, shareContext: false }, DEMO_JIRA_CONFIG).fields.description,
    );
    expect(text).toContain('Opened Tech Log after a sync');
    expect(text).not.toContain('TestAgent/1.0');
    expect(text).not.toContain('/tech-log/defects');
    // The local id still goes, so a report can be matched back to the browser
    // that raised it without disclosing anything about the reporter.
    expect(text).toContain('Local report id: FB-2026-004');
  });
});
