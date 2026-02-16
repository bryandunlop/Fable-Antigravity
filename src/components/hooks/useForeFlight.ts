// ==================== FOREFLIGHT REACT HOOKS ====================

import { useState, useEffect, useCallback } from 'react';
import { createForeFlightClient, ForeFlightAPIClient } from '../../utils/foreflight/client';
import {
  autoPopulateFRAT,
  syncFlightTimes,
  importSquawks,
  generateFuelRequest,
  autoUploadAirportEvaluations,
  syncWeightBalance,
  FRATFormData,
  PostFlightData,
  ImportedSquawk,
  FuelRequest,
  PassengerData
} from '../../utils/foreflight/services';
import {
  ForeFlightConfig,
  ForeFlightFlightPlan,
  ForeFlightAircraftPosition,
  ForeFlightSyncStatus,
  ForeFlightFile
} from '../../utils/foreflight/types';
import { toast } from 'sonner';

// ==================== CONFIG HOOK ====================

const DEFAULT_CONFIG: ForeFlightConfig = {
  apiKey: '',
  accountUuid: '',
  syncEnabled: false,
  integrations: {
    autoPopulateFRAT: false,
    syncFlightTimes: false,
    importSquawks: false,
    trackAircraftPosition: false,
    syncNOTAMs: false,
    syncLogbook: false,
    syncWeightBalance: false,
    weatherDeviationAlerts: false,
    autoFuelRequest: false,
    autoAirportEvaluation: false
  }
};

export function useForeFlightConfig() {
  const [config, setConfig] = useState<ForeFlightConfig>(() => {
    const saved = localStorage.getItem('foreflight_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const updateConfig = useCallback((updates: Partial<ForeFlightConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      localStorage.setItem('foreflight_config', JSON.stringify(newConfig));
      return newConfig;
    });
  }, []);

  const toggleIntegration = useCallback((integration: keyof ForeFlightConfig['integrations']) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        integrations: {
          ...prev.integrations,
          [integration]: !prev.integrations[integration]
        }
      };
      localStorage.setItem('foreflight_config', JSON.stringify(newConfig));
      return newConfig;
    });
  }, []);

  return { config, updateConfig, toggleIntegration };
}

// ==================== CLIENT HOOK ====================

export function useForeFlightClient() {
  const { config } = useForeFlightConfig();
  const [client, setClient] = useState<ForeFlightAPIClient>(() => 
    createForeFlightClient(config.apiKey, config.accountUuid)
  );

  useEffect(() => {
    setClient(createForeFlightClient(config.apiKey, config.accountUuid));
  }, [config.apiKey, config.accountUuid]);

  return client;
}

// ==================== FRAT AUTO-POPULATION HOOK ====================

export function useAutoPopulateFRAT() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const populateFRAT = useCallback(async (flightPlanId: string): Promise<FRATFormData | null> => {
    if (!config.integrations.autoPopulateFRAT) {
      toast.warning('FRAT auto-population is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await autoPopulateFRAT(client, flightPlanId);
      toast.success('FRAT form auto-populated from ForeFlight', {
        description: `Route: ${data.route}`
      });
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to populate FRAT';
      setError(errorMsg);
      toast.error('Failed to auto-populate FRAT', {
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.autoPopulateFRAT]);

  return { populateFRAT, loading, error };
}

// ==================== FLIGHT TIME SYNC HOOK ====================

export function useSyncFlightTimes() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncTimes = useCallback(async (logbookEntryId: string): Promise<PostFlightData | null> => {
    if (!config.integrations.syncFlightTimes) {
      toast.warning('Flight time sync is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await syncFlightTimes(client, logbookEntryId);
      toast.success('Flight times synced from ForeFlight', {
        description: `${data.departure} → ${data.destination}: ${data.flightTime}h`
      });
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync flight times';
      setError(errorMsg);
      toast.error('Failed to sync flight times', {
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.syncFlightTimes]);

  return { syncTimes, loading, error };
}

// ==================== SQUAWK IMPORT HOOK ====================

export function useImportSquawks() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFromForeFlight = useCallback(async (tailNumber?: string): Promise<ImportedSquawk[]> => {
    if (!config.integrations.importSquawks) {
      toast.warning('Squawk import is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const squawks = await importSquawks(client, tailNumber);
      toast.success(`Imported ${squawks.length} squawks from ForeFlight`, {
        description: tailNumber ? `For ${tailNumber}` : 'All aircraft'
      });
      return squawks;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import squawks';
      setError(errorMsg);
      toast.error('Failed to import squawks', {
        description: errorMsg
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.importSquawks]);

  return { importFromForeFlight, loading, error };
}

// ==================== FUEL REQUEST HOOK ====================

export function useAutoFuelRequest() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRequest = useCallback(async (flightPlanId: string): Promise<FuelRequest | null> => {
    if (!config.integrations.autoFuelRequest) {
      toast.warning('Auto fuel request is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const request = await generateFuelRequest(client, flightPlanId);
      toast.success('Fuel request auto-generated', {
        description: `${request.fuelRequired}gal ${request.fuelType} at ${request.departureAirport}`
      });
      return request;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate fuel request';
      setError(errorMsg);
      toast.error('Failed to generate fuel request', {
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.autoFuelRequest]);

  return { generateRequest, loading, error };
}

// ==================== AIRPORT EVALUATION UPLOAD HOOK ====================

export function useAirportEvaluationUpload() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadEvaluations = useCallback(async (
    flightPlanId: string,
    departureEvalPdf?: File,
    destinationEvalPdf?: File
  ): Promise<{ departure?: ForeFlightFile; destination?: ForeFlightFile } | null> => {
    if (!config.integrations.autoAirportEvaluation) {
      toast.warning('Airport evaluation upload is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await autoUploadAirportEvaluations(client, flightPlanId, departureEvalPdf, destinationEvalPdf);
      
      const uploaded = [];
      if (result.departure) uploaded.push('departure');
      if (result.destination) uploaded.push('destination');
      
      toast.success(`Airport evaluations uploaded to ForeFlight`, {
        description: `${uploaded.join(' & ')} evaluation${uploaded.length > 1 ? 's' : ''}`
      });
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload evaluations';
      setError(errorMsg);
      toast.error('Failed to upload airport evaluations', {
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.autoAirportEvaluation]);

  return { uploadEvaluations, loading, error };
}

// ==================== WEIGHT & BALANCE SYNC HOOK ====================

export function useSyncWeightBalance() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncWB = useCallback(async (flightPlanId: string): Promise<{
    passengers: PassengerData[];
    withinLimits: boolean;
    warnings: string[];
  } | null> => {
    if (!config.integrations.syncWeightBalance) {
      toast.warning('Weight & Balance sync is disabled', {
        description: 'Enable it in ForeFlight settings'
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await syncWeightBalance(client, flightPlanId);
      
      if (!data.withinLimits) {
        toast.warning('Weight & Balance out of limits!', {
          description: data.warnings.join(', ')
        });
      } else {
        toast.success('Weight & Balance synced from ForeFlight', {
          description: `${data.passengers.length} passengers`
        });
      }
      
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync W&B';
      setError(errorMsg);
      toast.error('Failed to sync Weight & Balance', {
        description: errorMsg
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.syncWeightBalance]);

  return { syncWB, loading, error };
}

// ==================== FLIGHT PLANS HOOK ====================

export function useForeFlightFlightPlans() {
  const client = useForeFlightClient();
  const [flightPlans, setFlightPlans] = useState<ForeFlightFlightPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlightPlans = useCallback(async (params?: {
    startDate?: string;
    endDate?: string;
    tailNumber?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.getFlightPlans(params);
      if (response.success && response.data) {
        setFlightPlans(response.data.items);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch flight plans');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch flight plans';
      setError(errorMsg);
      toast.error('Failed to fetch flight plans', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { flightPlans, fetchFlightPlans, loading, error };
}

// ==================== AIRCRAFT TRACKING HOOK ====================

export function useAircraftTracking() {
  const client = useForeFlightClient();
  const { config } = useForeFlightConfig();
  const [positions, setPositions] = useState<ForeFlightAircraftPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!config.integrations.trackAircraftPosition) return;

    setLoading(true);
    try {
      const response = await client.getFleetPositions();
      if (response.success && response.data) {
        setPositions(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch aircraft positions:', err);
    } finally {
      setLoading(false);
    }
  }, [client, config.integrations.trackAircraftPosition]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!config.integrations.trackAircraftPosition) return;

    fetchPositions();
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [fetchPositions, config.integrations.trackAircraftPosition]);

  return { positions, fetchPositions, loading };
}

// ==================== SYNC STATUS HOOK ====================

export function useForeFlightSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<ForeFlightSyncStatus>(() => {
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
  });

  const updateSyncStatus = useCallback((updates: Partial<ForeFlightSyncStatus>) => {
    setSyncStatus(prev => {
      const newStatus = { ...prev, ...updates };
      localStorage.setItem('foreflight_sync_status', JSON.stringify(newStatus));
      return newStatus;
    });
  }, []);

  return { syncStatus, updateSyncStatus };
}
