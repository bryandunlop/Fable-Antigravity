import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackDialog } from './FeedbackDialog';
import { feedbackStore } from './feedbackStore';

function open(route = '/tech-log/defects') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <FeedbackDialog open onOpenChange={() => {}} userRole="pilot" reporter="A. Reporter" />
    </MemoryRouter>,
  );
}

function fill(title: string, detail: string) {
  fireEvent.change(screen.getByLabelText('One line — what is it?'), { target: { value: title } });
  fireEvent.change(
    screen.getByLabelText('What happened, and what did you expect?'),
    { target: { value: detail } },
  );
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe('FeedbackDialog', () => {
  it('stores the report with the route the reporter was on', () => {
    open('/tech-log/defects');
    fireEvent.click(screen.getByText('Something is broken'));
    fill('Deferral list is stale', 'It showed yesterday’s deferrals.');
    fireEvent.click(screen.getByText('Send it'));

    const report = feedbackStore.list()[0];
    expect(report.kind).toBe('bug');
    expect(report.title).toBe('Deferral list is stale');
    expect(report.context.route).toBe('/tech-log/defects');
    expect(report.reporter).toBe('A. Reporter');
    // Never filed from the capture dialog — triage decides what becomes an issue.
    expect(report.sync).toBe('local');
    expect(report.jira).toBeUndefined();
    expect(screen.getByText(`Logged as ${report.id}`)).toBeTruthy();
  });

  it('refuses to submit without a summary and says what is missing', () => {
    open();
    const before = feedbackStore.list().length;
    fireEvent.click(screen.getByText('I have an idea'));
    fireEvent.click(screen.getByText('Send it'));

    expect(screen.getByText(/Still needed/)).toBeTruthy();
    expect(feedbackStore.list()).toHaveLength(before);
  });

  it('records the reporter opting out of the captured context', () => {
    open();
    fireEvent.click(screen.getByText('Something is broken'));
    fill('A title', 'A detail');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Send it'));

    expect(feedbackStore.list()[0].shareContext).toBe(false);
  });
});
