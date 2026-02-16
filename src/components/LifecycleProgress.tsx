import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, Circle, Clock } from 'lucide-react';
import { lifecycleStages, formatRelativeTime, calculateTimeInStage } from './utils/maintenanceUtils';
import { LifecycleStage, LifecycleEvent } from './contexts/MaintenanceContext';

interface LifecycleProgressProps {
  lifecycle: LifecycleStage;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export default function LifecycleProgress({ lifecycle, variant = 'default', className = '' }: LifecycleProgressProps) {
  const currentStageIndex = lifecycleStages.findIndex(s => s.key === lifecycle.current);
  
  // Filter stages - don't show deferred in normal flow
  const displayStages = lifecycle.current === 'deferred' 
    ? lifecycleStages 
    : lifecycleStages.filter(s => s.key !== 'deferred');

  const getCurrentStageInfo = (stageKey: string): LifecycleEvent | undefined => {
    return lifecycle.history.find(h => h.stage === stageKey);
  };

  const isStageCompleted = (stageKey: string): boolean => {
    const stageIndex = lifecycleStages.findIndex(s => s.key === stageKey);
    return stageIndex !== -1 && stageIndex <= currentStageIndex;
  };

  const isCurrentStage = (stageKey: string): boolean => {
    return stageKey === lifecycle.current;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {displayStages.map((stage, index) => {
          const completed = isStageCompleted(stage.key);
          const current = isCurrentStage(stage.key);
          
          return (
            <TooltipProvider key={stage.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${
                        completed
                          ? current
                            ? 'bg-blue-500 ring-2 ring-blue-200 ring-offset-1 animate-pulse'
                            : 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    {index < displayStages.length - 1 && (
                      <div
                        className={`w-4 h-0.5 ${
                          completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{stage.label}</p>
                  {getCurrentStageInfo(stage.key) && (
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(getCurrentStageInfo(stage.key)!.timestamp)}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Lifecycle Progress</h4>
            {lifecycle.estimatedCompletionTime && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                ETA: {new Date(lifecycle.estimatedCompletionTime).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          <div className="space-y-4">
            {displayStages.map((stage, index) => {
              const completed = isStageCompleted(stage.key);
              const current = isCurrentStage(stage.key);
              const stageInfo = getCurrentStageInfo(stage.key);
              
              return (
                <div key={stage.key} className="flex gap-3">
                  {/* Icon and line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        completed
                          ? current
                            ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {completed && !current ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Circle className={`w-4 h-4 ${current ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    {index < displayStages.length - 1 && (
                      <div
                        className={`w-0.5 h-10 ${
                          completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-medium ${current ? 'text-blue-600' : ''}`}>
                          {stage.icon} {stage.label}
                          {current && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </p>
                        {stageInfo && (
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>
                              By {stageInfo.performedBy} • {formatRelativeTime(stageInfo.timestamp)}
                            </p>
                            {current && (
                              <p className="text-blue-600">
                                In stage for {calculateTimeInStage(stageInfo.timestamp)}
                              </p>
                            )}
                            {stageInfo.notes && (
                              <p className="text-xs italic">{stageInfo.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {lifecycle.mttr && (
            <div className="pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">MTTR:</span> {lifecycle.mttr.toFixed(1)} hours
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        {displayStages.map((stage, index) => {
          const completed = isStageCompleted(stage.key);
          const current = isCurrentStage(stage.key);
          const stageInfo = getCurrentStageInfo(stage.key);
          
          return (
            <TooltipProvider key={stage.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          completed
                            ? current
                              ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {completed && !current ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Circle className={`w-5 h-5 ${current ? 'animate-pulse' : ''}`} />
                        )}
                      </div>
                      <p
                        className={`text-xs mt-2 text-center font-medium ${
                          current ? 'text-blue-600' : completed ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {stage.label}
                      </p>
                    </div>
                    {index < displayStages.length - 1 && (
                      <div
                        className={`h-1 flex-1 -mt-6 ${
                          completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{stage.icon} {stage.label}</p>
                    {stageInfo && (
                      <>
                        <p className="text-xs">
                          By {stageInfo.performedBy}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(stageInfo.timestamp)}
                        </p>
                        {current && (
                          <p className="text-xs text-blue-600">
                            In progress: {calculateTimeInStage(stageInfo.timestamp)}
                          </p>
                        )}
                        {stageInfo.notes && (
                          <p className="text-xs italic mt-1">{stageInfo.notes}</p>
                        )}
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
