import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * One defect report form, two entry points.
 *
 * The pilot report form used to exist three times — the shared dialog, a hand-inlined copy on the
 * Defects list page, and a partial copy in the correction dialog. Every field change (and defect
 * fields change often) then had to be made three times, and the copies drifted: the shared dialog's
 * own docstring claimed the Defects page used it while the Defects page rendered its own form.
 *
 * The shared dialog is STUBBED here on purpose. Rendering the real one would pass just as happily
 * against a re-inlined look-alike form; asserting the stub appeared proves the page reached for
 * `ReportDefectDialog` itself. Re-inlining the form on either page fails this test.
 */
vi.mock('../components/panels/ReportDefectDialog', () => ({
  ReportDefectDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shared-report-defect-dialog" /> : null,
}));

import { TechLogProvider } from '../TechLogContext';
import Defects from './Defects';
import AircraftDetail from './AircraftDetail';

function renderRoute(path: string, routePath: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TechLogProvider userRole="pilot">
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('report-defect entry points', () => {
  it('the Defects list page opens the shared ReportDefectDialog', async () => {
    renderRoute('/tech-log/defects', '/tech-log/defects', <Defects />);

    expect(screen.queryByTestId('shared-report-defect-dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /report defect/i }));
    expect(screen.getByTestId('shared-report-defect-dialog')).toBeInTheDocument();
  });

  it('the aircraft workspace opens the shared ReportDefectDialog', async () => {
    renderRoute('/tech-log/aircraft/N1PG', '/tech-log/aircraft/:tail', <AircraftDetail />);

    expect(screen.queryByTestId('shared-report-defect-dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /report defect/i }));
    expect(screen.getByTestId('shared-report-defect-dialog')).toBeInTheDocument();
  });
});
