/**
 * The trip workspace, docked over whichever lens you came from (D110 slice 3, canvas C: "the
 * drawer is the D109 workspace docked"). A booking opens the SAME page a scheduler gets at
 * /trips/:id — header strip, summary cells, tabs with counts — inside a sheet, with "Open full
 * record" for the wide view. A record that is not a booking (the myairops fixtures) still gets the
 * older checklist drawer until Phase 2 decides the pull path.
 */
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet';
import { TripsProvider } from '../trips/TripsContext';
import TripWorkspace from '../trips/pages/TripWorkspace';
import { TripDrawer } from './TripDrawer';

export function DockedTripDrawer({
  tripId, isBooking, focusTaskId, open, onOpenChange, userRole, additionalRoles = [],
}: {
  tripId: string | null;
  isBooking: boolean;
  focusTaskId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
  additionalRoles?: string[];
}) {
  if (!isBooking) {
    return <TripDrawer tripId={tripId} focusTaskId={focusTaskId} open={open} onOpenChange={onOpenChange} userRole={userRole} />;
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-3xl xl:max-w-5xl">
        <SheetTitle className="sr-only">Trip workspace</SheetTitle>
        <SheetDescription className="sr-only">The booking's itinerary, people, checklist, record, documents and sheet.</SheetDescription>
        {tripId && (
          <TripsProvider userRole={userRole} additionalRoles={additionalRoles}>
            <TripWorkspace tripId={tripId} docked />
          </TripsProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
