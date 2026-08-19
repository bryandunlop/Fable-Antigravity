import React, { useSyncExternalStore } from 'react';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import FleetLiveMap from './FleetLiveMap';
import FleetSchematicMap from './FleetSchematicMap';

interface FleetMapPanelProps {
  fleet: UnifiedFleetAircraft[];
  homeBase?: string;
  className?: string;
  /** 'dark' pins the basemap dark regardless of app theme — for the fixed-palette TV walls (D88). */
  theme?: 'auto' | 'dark';
}

/** Re-renders on browser online/offline transitions. */
function useOnline(): boolean {
  return useSyncExternalStore(
    cb => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
    () => true
  );
}

/**
 * The map region. The real basemap needs tiles from the network; when the client
 * is offline (a real case for the iPad build) it degrades to the coordinate-true
 * schematic, which needs nothing but the fleet's own positions.
 */
export default function FleetMapPanel(props: FleetMapPanelProps) {
  const online = useOnline();
  return online ? <FleetLiveMap {...props} /> : <FleetSchematicMap {...props} />;
}
