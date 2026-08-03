import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users, Utensils, Edit } from 'lucide-react';
import SummaryBar from './SummaryBar';
import RecordList, { RecordRow } from './RecordList';

describe('SummaryBar', () => {
  it('renders each item as value + label on one line', () => {
    render(<SummaryBar items={[{ label: 'legs', value: 3 }, { label: 'pax', value: 6, icon: Users }]} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/legs/)).toBeTruthy();
    expect(screen.getByText(/pax/)).toBeTruthy();
  });

  it('drops a hideWhenZero item at zero — "0 to chase" is noise, not information', () => {
    const { rerender } = render(
      <SummaryBar items={[{ label: 'catering to chase', value: 0, icon: Utensils, tone: 'alert', hideWhenZero: true }]} />,
    );
    expect(screen.queryByText(/catering to chase/)).toBeNull();

    rerender(
      <SummaryBar items={[{ label: 'catering to chase', value: 2, icon: Utensils, tone: 'alert', hideWhenZero: true }]} />,
    );
    expect(screen.getByText(/catering to chase/)).toBeTruthy();
  });

  it('keeps a zero that was not marked hideWhenZero', () => {
    render(<SummaryBar items={[{ label: 'legs', value: 0 }]} />);
    expect(screen.getByText(/legs/)).toBeTruthy();
  });

  it('renders nothing at all when every item is hidden, rather than an empty bar', () => {
    const { container } = render(
      <SummaryBar items={[{ label: 'issues', value: 0, hideWhenZero: true }]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('RecordRow', () => {
  it('opens on tap', () => {
    const onOpen = vi.fn();
    render(<RecordList><RecordRow title="Robert Johnson" meta="Board Chairman" onOpen={onOpen} /></RecordList>);
    fireEvent.click(screen.getByText('Robert Johnson'));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('keeps the secondary action out of the row button, so tapping it does not also open the row', () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    render(
      <RecordList>
        <RecordRow title="Sarah Chen" onOpen={onOpen} action={{ icon: Edit, label: 'Edit Sarah Chen', onClick: onEdit }} />
      </RecordList>,
    );
    fireEvent.click(screen.getByLabelText('Edit Sarah Chen'));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('names the icon-only action for assistive tech', () => {
    render(
      <RecordList>
        <RecordRow title="Sarah Chen" action={{ icon: Edit, label: 'Edit Sarah Chen', onClick: () => {} }} />
      </RecordList>,
    );
    expect(screen.getByLabelText('Edit Sarah Chen')).toBeTruthy();
  });

  it('renders as a non-interactive row when there is nothing to open', () => {
    render(<RecordList><RecordRow title="Read only" /></RecordList>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Read only')).toBeTruthy();
  });
});
