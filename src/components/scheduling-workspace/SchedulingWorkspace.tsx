import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AltimeterSpinner } from '../ui/LoadingSpinners';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import RunBoardPanel from './RunBoardPanel';
import TripsPanel from './TripsPanel';
import TemplatesPanel from './TemplatesPanel';
import InboxPanel from './InboxPanel';

interface SchedulingWorkspaceProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function SchedulingWorkspace({ userRole, additionalRoles }: SchedulingWorkspaceProps) {
  const { ready } = useSchedulingWorkspace();

  if (!ready) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AltimeterSpinner size={32} />
        <p className="text-muted-foreground text-sm">Loading scheduling workspace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scheduling Workspace</h1>
        <p className="text-muted-foreground">
          Run-board, trips, templates, and handoffs — the scheduling foundation, made visible and clickable.
        </p>
      </div>

      <Tabs defaultValue="run-board" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="run-board">Run-board</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="run-board" className="space-y-4">
          <RunBoardPanel userRole={userRole} />
        </TabsContent>

        <TabsContent value="trips" className="space-y-4">
          <TripsPanel userRole={userRole} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesPanel userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="inbox" className="space-y-4">
          <InboxPanel defaultTargetRole="pilot" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
