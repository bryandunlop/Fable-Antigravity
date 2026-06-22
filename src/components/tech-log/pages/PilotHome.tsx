import { useCurrentUser } from '../TechLogContext';
import Trips from './Trips';
import FleetStatus from './FleetStatus';

// The eTechLog root. Pilots land on their trips; maintenance lands on the fleet board.
export default function PilotHome() {
  const user = useCurrentUser();
  return user.role === 'MAINTENANCE' ? <FleetStatus /> : <Trips />;
}
