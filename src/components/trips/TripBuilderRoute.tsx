// Route wrapper that gives the trip builder somewhere to save to (LG-19 / D37).
//
// The builder is a controlled component: it hands its assembled trip to onSave
// and expects the caller to do something with it. The route table passed an empty
// function, so the whole trip evaporated on Save with no feedback at all — the
// audit's single most damaging facade. Cancel used window.history.back(), which
// leaves the app entirely when the builder was opened from a deep link.
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import TripBuilder from '../TripBuilder';
import { saveTrip, submitTrip } from './builtTripStore';

interface BuiltTripPayload {
  tripData?: { tripName?: string; clientName?: string };
  passengers?: unknown;
  itinerary?: unknown;
}

export default function TripBuilderRoute() {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId?: string }>();

  const persist = (trip: BuiltTripPayload) => {
    // TripBuilder accepts tripId but does not load that trip — it always starts
    // from its own blank state. Reusing the id here would let opening
    // /trip-builder/<existing-id> overwrite a real saved trip with an empty one on
    // the first Save. Until the builder can hydrate, a save always creates a new
    // record and the existing trip is left intact.
    const id = `trip-${Date.now()}`;
    saveTrip({
      id,
      tripName: trip?.tripData?.tripName ?? 'Untitled trip',
      clientName: trip?.tripData?.clientName ?? '',
      status: 'draft',
      tripData: trip?.tripData ?? {},
      passengers: trip?.passengers ?? [],
      itinerary: trip?.itinerary ?? [],
    });
    return id;
  };

  const handleSave = (trip: BuiltTripPayload) => {
    persist(trip);
    toast.success('Trip saved.', { description: 'You can reopen it from Booking Profile.' });
    navigate('/booking-profile');
  };

  // Submitting saves first: a trip that goes for review without its latest edits
  // stored is the same lost-work bug wearing a different button.
  const handleSubmitForReview = (trip: BuiltTripPayload) => {
    const id = persist(trip);
    submitTrip(id);
    toast.success('Trip submitted for review.', { description: 'It stays visible in Booking Profile while it is reviewed.' });
    navigate('/booking-profile');
  };

  // Always land somewhere inside the app. history.back() from a deep-linked
  // builder walks out past the login redirect.
  const handleCancel = () => navigate('/booking-profile');

  return (
    <TripBuilder
      tripId={tripId}
      onSave={handleSave}
      onSubmitForReview={handleSubmitForReview}
      onCancel={handleCancel}
    />
  );
}
