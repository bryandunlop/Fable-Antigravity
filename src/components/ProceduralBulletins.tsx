import BulletinsPage from './bulletins/BulletinsPage';

interface ProceduralBulletinsProps {
  userRole: string;
  userName?: string;
}

export default function ProceduralBulletins({ userRole }: ProceduralBulletinsProps) {
  return (
    <BulletinsPage
      userRole={userRole}
      config={{
        bulletinType: 'procedural',
        idPrefix: 'PB',
        headerTitle: 'Procedural Bulletins',
        headerSubtitle: 'Reference library for standard operating procedures and guidelines',
        docLabel: 'Procedural Bulletin',
      }}
    />
  );
}
