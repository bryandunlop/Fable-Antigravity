import React, { useEffect } from 'react';
import { useForeFlightConfig } from './hooks/useForeFlight';
import { createForeFlightClient } from '../utils/foreflight/client';
import { initializeSyncService } from '../utils/foreflight/syncService';
import { logger } from '../utils/logger';

interface ForeFlightSyncProviderProps {
  children: React.ReactNode;
}

export default function ForeFlightSyncProvider({ children }: ForeFlightSyncProviderProps) {
  const { config } = useForeFlightConfig();

  useEffect(() => {
    // Initialize ForeFlight sync service when config changes
    if (config.apiKey && config.accountUuid && config.syncEnabled) {
      logger.log('[ForeFlight] Initializing sync service...');

      const client = createForeFlightClient(config.apiKey, config.accountUuid);
      const syncService = initializeSyncService(client as any, config);

      // Set up event listeners for synced data
      syncService.onFlightPlans((flightPlans) => {
        logger.log(`[ForeFlight] ${flightPlans.length} flight plans synced`);
        // Dispatch custom event so other components can listen
        window.dispatchEvent(new CustomEvent('foreflight:flightPlans', { detail: flightPlans }));
      });

      syncService.onLogbook((entries) => {
        logger.log(`[ForeFlight] ${entries.length} logbook entries synced`);
        window.dispatchEvent(new CustomEvent('foreflight:logbook', { detail: entries }));
      });

      syncService.onSquawks((squawks) => {
        logger.log(`[ForeFlight] ${squawks.length} squawks synced`);
        window.dispatchEvent(new CustomEvent('foreflight:squawks', { detail: squawks }));
      });

      syncService.onPosition((positions) => {
        logger.log(`[ForeFlight] ${positions.length} aircraft positions updated`);
        window.dispatchEvent(new CustomEvent('foreflight:positions', { detail: positions }));
      });

      syncService.onFiles((files) => {
        logger.log(`[ForeFlight] ${files.length} files synced`);
        window.dispatchEvent(new CustomEvent('foreflight:files', { detail: files }));
      });

      return () => {
        // Cleanup on unmount
        syncService.stop();
      };
    }
  }, [config.apiKey, config.accountUuid, config.syncEnabled]);

  return <>{children}</>;
}
