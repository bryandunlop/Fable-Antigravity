import { Navigate, useParams } from 'react-router-dom';

/**
 * `/inventory-v2/trips/:tripId/reconcile` was the end-of-leg review's own route.
 * D86 made the review a state of the trip screen, so the route survives only to
 * keep old links, bookmarks and the browser history working — it lands on the
 * trip, which is where the review now lives.
 */
export default function ReconcileRedirect() {
  const { tripId } = useParams<{ tripId: string }>();
  return <Navigate to={`/inventory-v2/trips/${tripId ?? ''}`} replace />;
}
