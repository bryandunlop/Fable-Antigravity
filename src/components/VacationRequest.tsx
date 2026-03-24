
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { VacationRequestSystem } from './VacationRequestSystem';
import {
  VacationSchedulingApprovals,
  VacationRequest as ApprovalRequest
} from './VacationSchedulingApprovals';
import { VacationManagerReview } from './VacationManagerReview';
import { VacationMasterCalendar } from './VacationMasterCalendar';
import { MaintenanceVacationRequestForm } from './MaintenanceVacationRequestForm';
import { MaintenanceVacationApproval } from './MaintenanceVacationApproval';
import {
  PaybackEarningsReview,
  CrewMember,
  PaybackRequest as EarningsPaybackRequest
} from './PaybackEarningsReview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface VacationRequestProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function VacationRequest({ userRole, additionalRoles = [] }: VacationRequestProps) {
  // Lifted State for Vacation Requests
  const [vacationRequests, setVacationRequests] = React.useState<ApprovalRequest[]>([
    {
      id: 'req1',
      submitterId: 'user1',
      submitterName: 'John Smith',
      submitterPosition: 'Captain',
      requestType: 'Vacation',
      startDate: '2025-01-15',
      endDate: '2025-01-22',
      daysRequested: 7,
      status: 'pending_scheduling',
      comments: [
        {
          id: 'c1',
          author: 'John Smith',
          role: 'submitter',
          comment: 'Requesting vacation for family trip to Hawaii.',
          timestamp: new Date('2024-12-01T10:00:00')
        }
      ],
      submittedDate: new Date('2024-12-01T10:00:00'),
      lastModified: new Date('2024-12-01T10:00:00')
    },
    {
      id: 'req2',
      submitterId: 'user2',
      submitterName: 'Mike Johnson',
      submitterPosition: 'First Officer',
      requestType: 'Payback Stop',
      startDate: '2025-01-10',
      endDate: '2025-01-11',
      daysRequested: 1,
      status: 'pending_manager', // Status relevant for Manager Review
      schedulingApproval: 'tentative',
      comments: [
        {
          id: 'c2',
          author: 'Mike Johnson',
          role: 'submitter',
          comment: 'Using PBST day from November STOP coverage.',
          timestamp: new Date('2024-12-02T14:00:00')
        },
        {
          id: 'c2-1',
          author: 'Scheduling',
          role: 'scheduling',
          comment: 'Tentative approval.',
          timestamp: new Date('2024-12-03T14:00:00')
        }
      ],
      submittedDate: new Date('2024-12-02T14:00:00'),
      lastModified: new Date('2024-12-02T14:00:00')
    },
    {
      id: 'req3',
      submitterId: 'user3',
      submitterName: 'Emily Davis',
      submitterPosition: 'Flight Attendant',
      requestType: 'Vacation',
      startDate: '2025-02-14',
      endDate: '2025-02-21',
      daysRequested: 7,
      status: 'denied_by_manager',
      comments: [
        {
          id: 'c3',
          author: 'Emily Davis',
          role: 'submitter',
          comment: 'Requesting off for Valentines week.',
          timestamp: new Date('2024-12-05T09:00:00')
        },
        {
          id: 'c3-1',
          author: 'Chief Pilot - Sarah Johnson',
          role: 'manager',
          comment: 'Denied due to peak holiday travel period and minimum crew requirements already met.',
          timestamp: new Date('2024-12-06T11:00:00')
        }
      ],
      submittedDate: new Date('2024-12-05T09:00:00'),
      lastModified: new Date('2024-12-06T11:00:00')
    }
  ]);

  // Lifted State for Payback Crew Members
  const [crewMembers, setCrewMembers] = React.useState<CrewMember[]>(Array.from({ length: 5 }).map((_, i) => ({
    id: `crew - ${i} `,
    name: ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emily Davis', 'Chris Wilson'][i],
    position: i % 2 === 0 ? 'Captain' : 'First Officer',
    stopSchedule: {
      paybackStopAccumulated: Math.floor(Math.random() * 5),
      paybackRequests: Math.random() > 0.3 ? [
        {
          id: `pr - ${i} -${Date.now()} `,
          date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: 1,
          status: 'pending'
        }
      ] : []
    }
  })));

  // Derived Counts
  const pendingApprovalsCount = vacationRequests.filter(r => r.status === 'pending_scheduling').length;

  // For manager review, we count pending_manager. 
  // Note: VacationManagerReview might have more complex filtering, but this is a good approximation for the badge.
  const pendingManagerReviewCount = vacationRequests.filter(r => r.status === 'pending_manager' || r.status === 'tentative_manager').length;

  const pendingPaybackCount = crewMembers.reduce((acc, crew) =>
    acc + crew.stopSchedule.paybackRequests.filter(r => r.status === 'pending').length, 0
  );

  // Handlers
  const handleUpdateVacationRequests = (updatedRequests: ApprovalRequest[]) => {
    setVacationRequests(updatedRequests);
  };

  const handleApprovePayback = (crewId: string, requestId: string) => {
    setCrewMembers(prev => prev.map(crew => {
      if (crew.id !== crewId) return crew;
      const request = crew.stopSchedule.paybackRequests.find(r => r.id === requestId);
      if (!request) return crew;

      return {
        ...crew,
        stopSchedule: {
          ...crew.stopSchedule,
          paybackStopAccumulated: crew.stopSchedule.paybackStopAccumulated + request.days,
          paybackRequests: crew.stopSchedule.paybackRequests.filter(r => r.id !== requestId)
        }
      };
    }));
  };

  const handleRejectPayback = (crewId: string, requestId: string) => {
    setCrewMembers(prev => prev.map(crew => {
      if (crew.id !== crewId) return crew;
      return {
        ...crew,
        stopSchedule: {
          ...crew.stopSchedule,
          paybackRequests: crew.stopSchedule.paybackRequests.filter(r => r.id !== requestId)
        }
      };
    }));
  };


  const isMaintenanceTech = userRole === 'maintenance' || userRole === 'technician' || userRole === 'mechanic' || additionalRoles?.some(r => ['maintenance', 'technician', 'mechanic'].includes(r));
  const isShiftLead = userRole === 'shift-lead' || additionalRoles?.includes('shift-lead');
  const isChiefInspector = userRole === 'chief-inspector' || additionalRoles?.includes('chief-inspector');
  const isChiefPilot = userRole === 'chief-pilot' || additionalRoles?.includes('chief-pilot');
  const isSchedulingManager = userRole === 'scheduling-manager' || additionalRoles?.includes('scheduling-manager');
  const isFAManager = userRole === 'fa-manager' || additionalRoles?.includes('fa-manager');
  const isCoordinator = userRole === 'maintenance-coordinator' || additionalRoles?.includes('maintenance-coordinator');
  const isDOM = userRole === 'dom' || additionalRoles?.includes('dom');

  // If they have both tech and lead/manager roles, show tabs
  if (isMaintenanceTech && (isCoordinator || isDOM)) {
    return (
      <div className="p-6">
        <Tabs defaultValue={isDOM || isCoordinator ? "approvals" : "request"}>
          <TabsList className="mb-6">
            <TabsTrigger value="request">My Requests</TabsTrigger>
            {(isShiftLead || isChiefInspector || isCoordinator || isDOM) && (
              <TabsTrigger value="approvals">
                {isChiefInspector || isDOM ? 'Staff Approvals' : 'Lead Approvals'}
              </TabsTrigger>
            )}
            <TabsTrigger value="calendar">Master Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <MaintenanceVacationRequestForm />
          </TabsContent>

          <TabsContent value="approvals">
            <MaintenanceVacationApproval userRole={isChiefInspector || isDOM ? "chief-inspector" : "shift-lead"} />
          </TabsContent>

          <TabsContent value="calendar">
            <VacationMasterCalendar />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Fallback for single roles
  if (isChiefInspector || isDOM) {
    return (
      <div className="p-6">
        <MaintenanceVacationApproval userRole="chief-inspector" />
      </div>
    );
  }

  if (isShiftLead || isCoordinator) {
    return (
      <div className="p-6">
        <MaintenanceVacationApproval userRole="shift-lead" />
      </div>
    );
  }

  // For pilots and inflight crew - show the request system
  if (userRole === 'pilot' || userRole === 'inflight') {
    return <VacationRequestSystem />;
  }

  // For maintenance personnel - show request form
  if (isMaintenanceTech) {
    return <MaintenanceVacationRequestForm />;
  }

  // For scheduling role - show all tabs
  if (userRole === 'scheduling' || userRole === 'admin') {
    return (
      <div className="p-6">
        <Tabs defaultValue="approvals">
          <TabsList className="mb-6">
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              Pending Approvals
              {pendingApprovalsCount > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs h-5">{pendingApprovalsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex items-center gap-2">
              Manager Review
              {pendingManagerReviewCount > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs h-5">{pendingManagerReviewCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="payback" className="flex items-center gap-2">
              Payback Credits
              {pendingPaybackCount > 0 && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs h-5">{pendingPaybackCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="calendar">Master Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <VacationSchedulingApprovals requests={vacationRequests} onUpdateRequests={handleUpdateVacationRequests} />
          </TabsContent>

          <TabsContent value="manager">
            {/* Casting to any to bypass strict type check for now if types slightly differ, effectively treating them as compatible structure */}
            <VacationManagerReview requests={vacationRequests as any} onUpdateRequests={handleUpdateVacationRequests as any} />
          </TabsContent>

          <TabsContent value="calendar">
            <VacationMasterCalendar />
          </TabsContent>

          <TabsContent value="payback">
            <PaybackEarningsReview crewMembers={crewMembers} onApprove={handleApprovePayback} onReject={handleRejectPayback} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // For departmental managers - show manager review and calendar
  if (isChiefPilot || isSchedulingManager || isFAManager || userRole === 'lead') {
    return (
      <div className="p-6">
        <Tabs defaultValue="review">
          <TabsList className="mb-6">
            <TabsTrigger value="review">Manager Review</TabsTrigger>
            <TabsTrigger value="calendar">Master Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            {/* Same casting here */}
            <VacationManagerReview requests={vacationRequests as any} onUpdateRequests={handleUpdateVacationRequests as any} />
          </TabsContent>

          <TabsContent value="calendar">
            <VacationMasterCalendar />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Default view for other roles - just show the calendar
  return <VacationMasterCalendar />;
}
