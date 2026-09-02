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
  fireEvent.change(screen.getByLabelText('Summary'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(/What happened/), { target: { value: detail } });
}

beforeEach(() => {
  localStorage.clear();
  cleanup();
});

describe('FeedbackDialog', () => {
  it('shows every field at once — no steps to walk through', () => {
    open();
    expect(screen.getByLabelText('Summary')).toBeTruthy();
    expect(screen.getByLabelText(/What happened/)).toBeTruthy();
    expect(screen.getByLabelText('Which part of myGFO')).toBeTruthy();
    expect(screen.getByText('Screenshots')).toBeTruthy();
    expect(screen.getByText('Send')).toBeTruthy();
    expect(screen.queryByText(/Step 1 of/)).toBeNull();
  });

  it('opens on Bug and switches kind on a button press', () => {
    open();
    expect(screen.getByRole('button', { name: 'Bug' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Idea' }));
    expect(screen.getByRole('button', { name: 'Idea' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Bug' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('stores the report with the route the reporter was on', () => {
    open('/tech-log/defects');
    fill('Deferral list is stale', 'It showed yesterday’s deferrals.');
    fireEvent.click(screen.getByText('Send'));

    const report = feedbackStore.list()[0];
    expect(report.kind).toBe('bug');
    expect(report.title).toBe('Deferral list is stale');
    expect(report.context.route).toBe('/tech-log/defects');
    expect(report.reporter).toBe('A. Reporter');
    expect(report.attachments).toEqual([]);
    // Never filed from the capture dialog — triage decides what becomes an issue.
    expect(report.sync).toBe('local');
    expect(report.jira).toBeUndefined();
    expect(screen.getByText(`Logged as ${report.id}`)).toBeTruthy();
  });

  it('refuses to submit without a summary and says what is missing', () => {
    const before = feedbackStore.list().length;
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Idea' }));
    fireEvent.click(screen.getByText('Send'));

    expect(screen.getByText(/Still needed/)).toBeTruthy();
    expect(feedbackStore.list()).toHaveLength(before);
  });

  it('records the reporter opting out of the captured context', () => {
    open();
    fill('A title', 'A detail');
    fireEvent.click(screen.getByText('don’t include this'));
    expect(screen.getByText('include this')).toBeTruthy();
    fireEvent.click(screen.getByText('Send'));

    expect(feedbackStore.list()[0].shareContext).toBe(false);
  });
});
