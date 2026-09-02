// What a user reports about myGFO itself.
//
// Deliberately NOT the Suggestion Box (src/components/SuggestionBox.tsx). That is
// an operational suggestion channel routed to managers; this is product feedback
// about the software — bugs, ideas, change requests and help requests — and its
// destination is the engineering backlog in Jira.

export type FeedbackKind = 'bug' | 'idea' | 'change' | 'help';

/**
 * `short` is the button face — one word, because four buttons sit side by side.
 * `label` is the same choice written as a sentence, used wherever there is room
 * (the board's detail panel, the Jira issue). `blurb` is the hover title.
 */
export const FEEDBACK_KINDS: {
  kind: FeedbackKind;
  short: string;
  label: string;
  blurb: string;
}[] = [
  { kind: 'bug', short: 'Bug', label: 'Something is broken', blurb: 'It did the wrong thing, or nothing at all.' },
  { kind: 'idea', short: 'Idea', label: 'An idea', blurb: 'Something myGFO does not do yet.' },
  { kind: 'change', short: 'Change', label: 'A change to what exists', blurb: 'It works, but not the way we work.' },
  { kind: 'help', short: 'Help', label: 'A question', blurb: 'I cannot find it, or cannot make it do the thing.' },
];

/**
 * Reporter-facing impact, not engineering priority. The words are about the
 * reporter's day ("I cannot fly / work") rather than P1..P4, because a pilot on a
 * ramp will not guess our severity ladder correctly and a wrong guess is worse
 * than none. Triage maps these to Jira labels; a human sets real priority in Jira.
 */
export type FeedbackImpact = 'blocked' | 'painful' | 'annoying' | 'idea-only';

export const FEEDBACK_IMPACTS: { impact: FeedbackImpact; label: string; blurb: string }[] = [
  { impact: 'blocked', label: 'I am blocked', blurb: 'I cannot complete the task at all.' },
  { impact: 'painful', label: 'Painful workaround', blurb: 'I got there, but the long way round.' },
  { impact: 'annoying', label: 'Annoying', blurb: 'It works; it grates.' },
  { impact: 'idea-only', label: 'No impact today', blurb: 'Just an idea for later.' },
];

/**
 * A screenshot the reporter attached. Held as a data URL because the demo has no
 * blob store; the real integration streams the same bytes to Jira's multipart
 * attachment endpoint and keeps nothing locally.
 */
export interface FeedbackAttachment {
  id: string;
  name: string;
  mimeType: string;
  /** Bytes AFTER downscaling — what actually gets stored and sent. */
  size: number;
  dataUrl: string;
  /** Jira attachment id, once uploaded. Absent until the issue is filed. */
  jiraAttachmentId?: string;
}

/** Where the report is on its way to Jira. Separate from the Jira status itself. */
export type SyncState = 'local' | 'sending' | 'filed' | 'failed';

export interface JiraLink {
  /** Jira issue key, e.g. MYGFO-412. Absent until the issue is created. */
  key: string;
  /** Jira internal issue id — the stable handle; keys move if a project is renamed. */
  issueId: string;
  /** Human-clickable URL. */
  url: string;
  /** Last Jira status name we read back, e.g. 'To Do', 'In Progress', 'Done'. */
  status: string;
  /** ISO timestamp of the last successful read/write against Jira. */
  syncedAt: string;
}

/**
 * Context the app captures so the reporter does not have to. Every field here is
 * something a triaging developer would otherwise have to ask for, and asking is
 * where in-app reporting usually dies.
 */
export interface FeedbackContext {
  /** Route the reporter was on when they opened the dialog. */
  route: string;
  /** Human label for that route, from the nav manifest where one exists. */
  screen: string;
  role: string;
  appVersion: string;
  /** Viewport, so 'the button is off screen' is answerable without a call. */
  viewport: string;
  userAgent: string;
}

export interface FeedbackReport {
  /** Local id, minted before any Jira round trip so the report survives a failure. */
  id: string;
  kind: FeedbackKind;
  title: string;
  detail: string;
  impact: FeedbackImpact;
  /** Product area, defaulted from the route and editable by the reporter. */
  area: string;
  reporter: string;
  submittedAt: string;
  /** False when the reporter opts out of sending the captured context. */
  shareContext: boolean;
  context: FeedbackContext;
  attachments: FeedbackAttachment[];
  sync: SyncState;
  /** Why the last send failed, and whether trying again could help. */
  syncError?: { message: string; retryable: boolean };
  /**
   * The issue was created but one or more screenshots did not upload. Filing is
   * NOT rolled back — an issue with a missing image beats no issue at all, and
   * silently dropping the evidence is the failure a reporter would never see.
   */
  attachmentError?: string;
  jira?: JiraLink;
}
