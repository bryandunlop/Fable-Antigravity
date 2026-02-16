import React from 'react';
import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react';
import { WORKFLOW_STAGES } from '../../contexts/HazardContext';

interface ProgressTrackerProps {
    currentStage: string;
    onStageClick?: (stage: string) => void;
    allowNavigation?: boolean;
}

// Map the detailed stages to high-level phases
export const PHASES = [
    {
        id: 'submission',
        label: 'Submission',
        stages: [WORKFLOW_STAGES.SUBMITTED]
    },
    {
        id: 'investigation',
        label: 'Investigation',
        stages: [WORKFLOW_STAGES.SM_INVESTIGATION]
    },
    {
        id: 'mitigation',
        label: 'Mitigation',
        stages: [WORKFLOW_STAGES.ASSIGN_MITIGATION, WORKFLOW_STAGES.MITIGATION_DEVELOPMENT, WORKFLOW_STAGES.SM_REVIEW]
    },
    {
        id: 'approvals',
        label: 'Approvals',
        stages: [WORKFLOW_STAGES.LINE_MANAGER_APPROVAL, WORKFLOW_STAGES.EXEC_APPROVAL]
    },
    {
        id: 'closure',
        label: 'Closure',
        stages: [
            WORKFLOW_STAGES.IMPLEMENTATION,
            WORKFLOW_STAGES.EFFECTIVENESS_REVIEW,
            WORKFLOW_STAGES.CLOSED
        ]
    }
];

export default function ProgressTracker({ currentStage, onStageClick, allowNavigation = false }: ProgressTrackerProps) {
    // Determine current phase index
    const currentPhaseIndex = PHASES.findIndex(p => p.stages.includes(currentStage));

    return (
        <div className="w-full bg-white border rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-6">Workflow Progress</h3>

            <div className="flex items-center justify-between relative">
                {/* Connecting Line - Background */}
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-10" />

                {/* Connecting Line - Progress */}
                <div
                    className="absolute top-5 left-0 h-1 bg-green-500 -z-10 transition-all duration-500 ease-in-out"
                    style={{ width: `${(currentPhaseIndex / (PHASES.length - 1)) * 100}%` }}
                />

                {PHASES.map((phase, index) => {
                    const isCompleted = index < currentPhaseIndex;
                    const isCurrent = index === currentPhaseIndex;
                    const isClickable = isCompleted || isCurrent || allowNavigation;

                    return (
                        <div key={phase.id} className="flex flex-col items-center flex-1">
                            <button
                                // For now, clicking a phase could jump to the first stage of that phase if navigation allowed
                                onClick={() => isClickable && onStageClick?.(phase.stages[0])}
                                disabled={!isClickable}
                                className={`
                                    relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 bg-white
                                    ${isCompleted ? 'border-green-500 text-green-500' : ''}
                                    ${isCurrent ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50' : ''}
                                    ${!isCompleted && !isCurrent ? 'border-gray-200 text-gray-300' : ''}
                                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                                `}
                            >
                                {isCompleted ? (
                                    <CheckCircle className="w-6 h-6 fill-green-500 text-white" />
                                ) : isCurrent ? (
                                    <div className="w-4 h-4 rounded-full bg-blue-600" />
                                ) : (
                                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                                )}
                            </button>

                            <div className="mt-3 text-center">
                                <span className={`
                                    block text-sm font-medium transition-colors
                                    ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}
                                `}>
                                    {phase.label}
                                </span>
                                {isCurrent && (
                                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                                        Current Phase
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
