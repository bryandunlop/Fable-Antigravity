import React from 'react';
import { MaintenanceWorkflowProvider } from './maintenance-workflow/context/MaintenanceWorkflowContext';
import MWShiftHandover from './maintenance-workflow/ShiftHandover';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Standalone Maintenance Turnover Form
 * This component wraps the existing ShiftHandover functionality with its required context provider
 * to allow it to be used as a standalone page.
 */
export default function MaintenanceTurnoverForm() {
    return (
        <ErrorBoundary>
            <MaintenanceWorkflowProvider>
                <div className="animation-fade-in">
                    <MWShiftHandover />
                </div>
            </MaintenanceWorkflowProvider>
        </ErrorBoundary>
    );
}
