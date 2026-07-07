import BulletinsPage from './BulletinsPage';

interface FlightOperationsBulletinsProps {
  userRole: string;
}

/** Flight Operations Bulletins — same mechanics as Procedural Bulletins but for
 * "nonofficial" / interim processes that have not yet been folded into an SOP. */
export default function FlightOperationsBulletins({ userRole }: FlightOperationsBulletinsProps) {
  return (
    <BulletinsPage
      userRole={userRole}
      config={{
        bulletinType: 'flight-ops',
        idPrefix: 'FOB',
        headerTitle: 'Flight Operations Bulletins',
        headerSubtitle: 'Interim and nonofficial operational notes ahead of formal SOP updates',
        docLabel: 'Flight Operations Bulletin',
      }}
    />
  );
}
