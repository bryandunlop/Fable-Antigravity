import { useCurrentUser } from '../TechLogContext';
import Trips from './Trips';
import WorkQueue from './WorkQueue';

// The eTechLog root. Pilots land on their trips; maintenance lands on the Work Queue
// ("what needs me"), whose fleet strip answers "what's the state of the world".
export default function PilotHome() {
  const user = useCurrentUser();
  return user.role === 'MAINTENANCE' ? <WorkQueue /> : <Trips />;
}
