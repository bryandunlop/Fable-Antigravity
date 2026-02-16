import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Zap,
  Database,
  Eye
} from 'lucide-react';
import { useForeFlightConfig } from './hooks/useForeFlight';

interface SyncedData {
  flightPlans: any[];
  logbook: any[];
  squawks: any[];
  positions: any[];
  files: any[];
}

export default function ForeFlightDiagnostics() {
  const { config } = useForeFlightConfig();
  const [syncedData, setSyncedData] = useState<SyncedData>({
    flightPlans: [],
    logbook: [],
    squawks: [],
    positions: [],
    files: []
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadSyncedData = () => {
    const flightPlans = JSON.parse(localStorage.getItem('foreflight_flight_plans') || '[]');
    const logbook = JSON.parse(localStorage.getItem('foreflight_logbook') || '[]');
    const squawks = JSON.parse(localStorage.getItem('foreflight_squawks') || '[]');
    const positions = JSON.parse(localStorage.getItem('foreflight_positions') || '[]');
    const files = JSON.parse(localStorage.getItem('foreflight_files') || '[]');

    setSyncedData({ flightPlans, logbook, squawks, positions, files });
    setLastUpdate(new Date());
  };

  useEffect(() => {
    loadSyncedData();

    // Listen for ForeFlight sync events
    const handleFlightPlans = () => loadSyncedData();
    const handleLogbook = () => loadSyncedData();
    const handleSquawks = () => loadSyncedData();
    const handlePositions = () => loadSyncedData();
    const handleFiles = () => loadSyncedData();

    window.addEventListener('foreflight:flightPlans', handleFlightPlans);
    window.addEventListener('foreflight:logbook', handleLogbook);
    window.addEventListener('foreflight:squawks', handleSquawks);
    window.addEventListener('foreflight:positions', handlePositions);
    window.addEventListener('foreflight:files', handleFiles);

    // Refresh every 30 seconds
    const interval = setInterval(loadSyncedData, 30000);

    return () => {
      window.removeEventListener('foreflight:flightPlans', handleFlightPlans);
      window.removeEventListener('foreflight:logbook', handleLogbook);
      window.removeEventListener('foreflight:squawks', handleSquawks);
      window.removeEventListener('foreflight:positions', handlePositions);
      window.removeEventListener('foreflight:files', handleFiles);
      clearInterval(interval);
    };
  }, []);

  const isConfigured = config.apiKey && config.accountUuid;
  const isSyncEnabled = config.syncEnabled;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            ForeFlight Sync Diagnostics
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time view of synced data from ForeFlight API
          </p>
        </div>
        <Button onClick={loadSyncedData} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Configuration</div>
                <div className="font-medium mt-1">
                  {isConfigured ? 'Connected' : 'Not Connected'}
                </div>
              </div>
              {isConfigured ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Sync Service</div>
                <div className="font-medium mt-1">
                  {isSyncEnabled ? 'Active' : 'Disabled'}
                </div>
              </div>
              {isSyncEnabled ? (
                <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
              ) : (
                <Zap className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Last Update</div>
                <div className="font-medium mt-1">
                  {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Synced Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Synced Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataRow 
            label="Flight Plans"
            count={syncedData.flightPlans.length}
            enabled={config.integrations.autoPopulateFRAT}
            data={syncedData.flightPlans}
          />
          <DataRow 
            label="Logbook Entries"
            count={syncedData.logbook.length}
            enabled={config.integrations.syncFlightTimes || config.integrations.syncLogbook}
            data={syncedData.logbook}
          />
          <DataRow 
            label="Squawks"
            count={syncedData.squawks.length}
            enabled={config.integrations.importSquawks}
            data={syncedData.squawks}
          />
          <DataRow 
            label="Aircraft Positions"
            count={syncedData.positions.length}
            enabled={config.integrations.trackAircraftPosition}
            data={syncedData.positions}
          />
          <DataRow 
            label="Files"
            count={syncedData.files.length}
            enabled={config.integrations.autoAirportEvaluation}
            data={syncedData.files}
          />
        </CardContent>
      </Card>

      {/* Browser Console Tip */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Developer Tip</div>
              <div className="text-sm text-blue-800 mt-1">
                Open browser console (F12) to see detailed ForeFlight API logs. 
                Look for messages starting with <code className="bg-blue-200 px-1 rounded">[ForeFlight]</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataRow({ 
  label, 
  count, 
  enabled, 
  data 
}: { 
  label: string; 
  count: number; 
  enabled: boolean;
  data: any[];
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border-b pb-4 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-sm text-gray-600">
              {enabled ? `${count} items synced` : 'Integration disabled'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge variant="outline">
            {count}
          </Badge>
          {count > 0 && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'View'}
            </Button>
          )}
        </div>
      </div>
      
      {showDetails && count > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded border text-xs overflow-auto max-h-60">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
