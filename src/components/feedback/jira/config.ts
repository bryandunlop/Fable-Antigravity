// Which Jira, which project, which issue type per kind.
//
// TARGET: the P&G work Jira instance. Nothing here is wired to it yet — the demo
// runs the mock — but every value the real integration needs is named in one
// place so switching instance is a config edit, not a code hunt.

import type { FeedbackKind } from '../types';

export interface JiraConfig {
  /** Base URL the CLIENT talks to. In production this is OUR proxy, not Atlassian. */
  apiBaseUrl: string;
  /** Jira site base, used only to build human-clickable links. */
  siteBaseUrl: string;
  /** Project key issues are filed under, e.g. 'MYGFO'. */
  projectKey: string;
  /** Jira issue type name per feedback kind. Names must exist in the target project. */
  issueTypeByKind: Record<FeedbackKind, string>;
  /** Applied to every issue, so filing from myGFO is filterable in Jira. */
  baseLabels: string[];
  /**
   * Name of the secret holding the Jira API token. The VALUE never appears in
   * this repo — the server proxy reads it from the platform secret store.
   */
  secretName: string;
}

/**
 * Demo configuration. `apiBaseUrl` is deliberately a placeholder: nothing in the
 * demo build issues a network call, and a real-looking URL here would be an
 * invitation to point the client straight at Atlassian (which CORS blocks and
 * which would put the token in a browser).
 */
export const DEMO_JIRA_CONFIG: JiraConfig = {
  apiBaseUrl: '/api/jira',
  siteBaseUrl: 'https://jira.example-work-instance.com',
  projectKey: 'MYGFO',
  issueTypeByKind: {
    bug: 'Bug',
    idea: 'Story',
    change: 'Task',
    help: 'Support Request',
  },
  baseLabels: ['mygfo', 'in-app-report'],
  secretName: 'Jira--ApiToken',
};
