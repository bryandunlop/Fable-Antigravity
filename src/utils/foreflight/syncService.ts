// ==================== FOREFLIGHT SYNC SERVICE ====================
// Background sync service that polls ForeFlight API for updates

import { RealForeFlightAPIClient } from './realClient';
import { MockForeFlightClient } from './client';
import { ForeFlightConfig, ForeFlightSyncStatus } from './types';
import { toast } from 'sonner';
import { logger } from '../logger';

export class ForeFlightSyncService {
  private client: RealForeFlightAPIClient | MockForeFlightClient;
  private config: ForeFlightConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Callbacks for when data is synced
  private onFlightPlansSynced?: (flightPlans: any[]) => void;
  private onLogbookSynced?: (entries: any[]) => void;
  private onSquawksSynced?: (squawks: any[]) => void;
  private onPositionUpdated?: (positions: any[]) => void;
  private onFilesSynced?: (files: any[]) => void;

  constructor(
    client: RealForeFlightAPIClient | MockForeFlightClient,
    config: ForeFlightConfig
  ) {
    this.client = client;
    this.config = config;
  }

  // ==================== START/STOP SYNC ====================

  start(intervalMs: number = 60000) { // Default 1 minute
    if (this.isRunning) {
      logger.log('[ForeFlight Sync] Already running');
      return;
    }

    logger.log(`[ForeFlight Sync] Starting (interval: ${intervalMs}ms)`);
    this.isRunning = true;

    // Run initial sync
    this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    logger.log('[ForeFlight Sync] Stopped');
  }

  // ==================== PERFORM SYNC ====================

  private async performSync() {
    if (!this.config.syncEnabled) {
      logger.log('[ForeFlight Sync] Sync disabled in config');
      return;
    }

    logger.log('[ForeFlight Sync] Starting sync cycle...');

    const syncStatus: Partial<ForeFlightSyncStatus> = {
      lastSync: new Date().toISOString(),
      syncInProgress: true,
      errors: [],
      stats: {
        flightPlansSynced: 0,
        squawksImported: 0,
        logbookEntriesSynced: 0,
        positionUpdates: 0,
        filesSynced: 0
      }
    };

    try {
      // Sync flight plans
      if (this.config.integrations.autoPopulateFRAT) {
        await this.syncFlightPlans(syncStatus);
      }

      // Sync logbook entries
      if (this.config.integrations.syncFlightTimes || this.config.integrations.syncLogbook) {
        await this.syncLogbook(syncStatus);
      }

      // Sync squawks
      if (this.config.integrations.importSquawks) {
        await this.syncSquawks(syncStatus);
      }

      // Sync aircraft positions
      if (this.config.integrations.trackAircraftPosition) {
        await this.syncPositions(syncStatus);
      }

      // Sync files
      if (this.config.integrations.autoAirportEvaluation) {
        await this.syncFiles(syncStatus);
      }

      logger.log('[ForeFlight Sync] Sync cycle complete', syncStatus.stats);

    } catch (error) {
      console.error('[ForeFlight Sync] Sync cycle failed:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'general',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      syncStatus.syncInProgress = false;
      this.updateSyncStatus(syncStatus);
    }
  }

  // ==================== SYNC FLIGHT PLANS ====================

  private async syncFlightPlans(syncStatus: Partial<ForeFlightSyncStatus>) {
    try {
      logger.log('[ForeFlight Sync] Syncing flight plans...');

      // Get flight plans from last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await this.client.getFlightPlans({
        startDate: startDate.toISOString(),
        limit: 50
      });

      if (response.success && response.data) {
        const flightPlans = response.data.items;
        logger.log(`[ForeFlight Sync] Found ${flightPlans.length} flight plans`);

        syncStatus.stats!.flightPlansSynced = flightPlans.length;

        // Notify listeners
        if (this.onFlightPlansSynced) {
          this.onFlightPlansSynced(flightPlans);
        }

        // Store in localStorage for offline access
        localStorage.setItem('foreflight_flight_plans', JSON.stringify(flightPlans));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch flight plans');
      }
    } catch (error) {
      console.error('[ForeFlight Sync] Failed to sync flight plans:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'flight_plans',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== SYNC LOGBOOK ====================

  private async syncLogbook(syncStatus: Partial<ForeFlightSyncStatus>) {
    try {
      logger.log('[ForeFlight Sync] Syncing logbook entries...');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await this.client.getLogbookEntries({
        startDate: startDate.toISOString(),
        limit: 50
      });

      if (response.success && response.data) {
        const entries = response.data.items;
        logger.log(`[ForeFlight Sync] Found ${entries.length} logbook entries`);

        syncStatus.stats!.logbookEntriesSynced = entries.length;

        if (this.onLogbookSynced) {
          this.onLogbookSynced(entries);
        }

        localStorage.setItem('foreflight_logbook', JSON.stringify(entries));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch logbook');
      }
    } catch (error) {
      console.error('[ForeFlight Sync] Failed to sync logbook:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'logbook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== SYNC SQUAWKS ====================

  private async syncSquawks(syncStatus: Partial<ForeFlightSyncStatus>) {
    try {
      logger.log('[ForeFlight Sync] Syncing squawks...');

      // In a real implementation, this would call a squawks endpoint
      // For now, we'll skip if the method doesn't exist
      if ('getSquawks' in this.client) {
        const response = await (this.client as any).getSquawks({ limit: 50 });

        if (response.success && response.data) {
          const squawks = response.data.items;
          logger.log(`[ForeFlight Sync] Found ${squawks.length} squawks`);

          syncStatus.stats!.squawksImported = squawks.length;

          if (this.onSquawksSynced) {
            this.onSquawksSynced(squawks);
          }

          localStorage.setItem('foreflight_squawks', JSON.stringify(squawks));
        }
      }
    } catch (error) {
      console.error('[ForeFlight Sync] Failed to sync squawks:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'squawks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== SYNC POSITIONS ====================

  private async syncPositions(syncStatus: Partial<ForeFlightSyncStatus>) {
    try {
      logger.log('[ForeFlight Sync] Syncing aircraft positions...');

      const response = await this.client.getFleetPositions();

      if (response.success && response.data) {
        const positions = response.data;
        logger.log(`[ForeFlight Sync] Found ${positions.length} aircraft positions`);

        syncStatus.stats!.positionUpdates = positions.length;

        if (this.onPositionUpdated) {
          this.onPositionUpdated(positions);
        }

        localStorage.setItem('foreflight_positions', JSON.stringify(positions));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch positions');
      }
    } catch (error) {
      console.error('[ForeFlight Sync] Failed to sync positions:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'positions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== SYNC FILES ====================

  private async syncFiles(syncStatus: Partial<ForeFlightSyncStatus>) {
    try {
      logger.log('[ForeFlight Sync] Syncing files...');

      const response = await this.client.getFiles({ limit: 50 });

      if (response.success && response.data) {
        const files = response.data.items;
        logger.log(`[ForeFlight Sync] Found ${files.length} files`);

        syncStatus.stats!.filesSynced = files.length;

        if (this.onFilesSynced) {
          this.onFilesSynced(files);
        }

        localStorage.setItem('foreflight_files', JSON.stringify(files));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('[ForeFlight Sync] Failed to sync files:', error);
      syncStatus.errors?.push({
        timestamp: new Date().toISOString(),
        integration: 'files',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==================== UPDATE SYNC STATUS ====================

  private updateSyncStatus(syncStatus: Partial<ForeFlightSyncStatus>) {
    const currentStatus = this.getSyncStatus();
    const newStatus = {
      ...currentStatus,
      ...syncStatus,
      stats: {
        ...currentStatus.stats,
        ...syncStatus.stats
      }
    };

    localStorage.setItem('foreflight_sync_status', JSON.stringify(newStatus));

    // Show toast notification if there are errors
    if (syncStatus.errors && syncStatus.errors.length > 0) {
      toast.error('ForeFlight sync encountered errors', {
        description: `${syncStatus.errors.length} error(s) - check Sync Status tab`
      });
    }
  }

  private getSyncStatus(): ForeFlightSyncStatus {
    const saved = localStorage.getItem('foreflight_sync_status');
    return saved ? JSON.parse(saved) : {
      lastSync: new Date().toISOString(),
      syncInProgress: false,
      errors: [],
      stats: {
        flightPlansSynced: 0,
        squawksImported: 0,
        logbookEntriesSynced: 0,
        positionUpdates: 0,
        filesSynced: 0
      }
    };
  }

  // ==================== REGISTER CALLBACKS ====================

  onFlightPlans(callback: (flightPlans: any[]) => void) {
    this.onFlightPlansSynced = callback;
  }

  onLogbook(callback: (entries: any[]) => void) {
    this.onLogbookSynced = callback;
  }

  onSquawks(callback: (squawks: any[]) => void) {
    this.onSquawksSynced = callback;
  }

  onPosition(callback: (positions: any[]) => void) {
    this.onPositionUpdated = callback;
  }

  onFiles(callback: (files: any[]) => void) {
    this.onFilesSynced = callback;
  }

  // ==================== MANUAL SYNC ====================

  async syncNow() {
    logger.log('[ForeFlight Sync] Manual sync triggered');
    await this.performSync();
    toast.success('ForeFlight sync complete', {
      description: 'All data has been refreshed'
    });
  }
}

// ==================== GLOBAL SYNC INSTANCE ====================

let globalSyncService: ForeFlightSyncService | null = null;

export function initializeSyncService(
  client: RealForeFlightAPIClient | MockForeFlightClient,
  config: ForeFlightConfig
): ForeFlightSyncService {
  if (globalSyncService) {
    globalSyncService.stop();
  }

  globalSyncService = new ForeFlightSyncService(client, config);

  if (config.syncEnabled) {
    globalSyncService.start();
  }

  return globalSyncService;
}

export function getSyncService(): ForeFlightSyncService | null {
  return globalSyncService;
}

export function stopSyncService() {
  if (globalSyncService) {
    globalSyncService.stop();
    globalSyncService = null;
  }
}
