import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Activity,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface SyncReport {
  timestamp: string;
  total: number;
  successful: number;
  updated: number;
  failed: number;
  details: Array<{
    icao: string;
    status: string;
    changes?: string[];
  }>;
}

export default function AirportSyncMonitor() {
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState('');
  const [syncLogs, setSyncLogs] = useState<any[]>([]);

  // Load last sync report on mount
  useEffect(() => {
    fetchLastReport();
  }, []);

  const fetchLastReport = async () => {
    setLoading(true);
    try {
      // Mock Data - Supabase removed
      setTimeout(() => {
        setLastReport({
          timestamp: new Date().toISOString(),
          total: 1250,
          successful: 1248,
          updated: 2,
          failed: 0,
          details: [
            { icao: 'KTEB', status: 'updated', changes: ['Updated FBO hours'] },
            { icao: 'EGLL', status: 'updated', changes: ['Runway 27L maintenance note added'] }
          ]
        });
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error fetching sync report:', error);
      setLoading(false);
    }
  };

  const triggerFullSync = async () => {
    if (!confirm('Trigger a full sync of all airports? This may take several minutes.')) {
      return;
    }

    setSyncing(true);
    try {
      // Mock Sync - Supabase removed
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Sync Simulation Complete!\n\nTotal: 1250\nUpdated: 0\nUnchanged: 1250\nFailed: 0');
      fetchLastReport();
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Failed to trigger sync. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const syncSingleAirport = async () => {
    if (!selectedAirport) {
      alert('Please enter an ICAO code');
      return;
    }

    setSyncing(true);
    try {
      // Mock Sync - Supabase removed
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert(`Sync Simulation Complete for ${selectedAirport.toUpperCase()}!\n\nNo changes detected.`);

      // Refresh logs for this airport
      fetchAirportLogs(selectedAirport.toUpperCase());
    } catch (error) {
      console.error('Error syncing airport:', error);
      alert('Failed to sync airport. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const fetchAirportLogs = async (icao: string) => {
    try {
      // Mock logs - Supabase removed
      setSyncLogs([
        { timestamp: new Date().toISOString(), previousUpdate: '2023-11-15T10:00:00Z', changes: [] }
      ]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Airport Data Sync Monitor</h1>
        <p className="text-muted-foreground">
          Monitor and manage automated airport data synchronization (Demo Mode)
        </p>
      </div>

      {/* Last Sync Summary */}
      {lastReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Last Sync Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Database className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{lastReport.total}</p>
                <p className="text-sm text-muted-foreground">Total Airports</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{lastReport.updated}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-2xl font-bold">{lastReport.successful - lastReport.updated}</p>
                <p className="text-sm text-muted-foreground">Unchanged</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                <p className="text-2xl font-bold">{lastReport.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Last synced: {formatDate(lastReport.timestamp)} ({formatTimeSince(lastReport.timestamp)})</span>
            </div>

            {/* Recently Updated Airports */}
            {lastReport.details.filter(d => d.status === 'updated').length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Recently Updated Airports</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lastReport.details
                    .filter(d => d.status === 'updated')
                    .map((detail, idx) => (
                      <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-medium text-sm">{detail.icao}</p>
                        {detail.changes && detail.changes.length > 0 && (
                          <ul className="mt-1 text-xs text-muted-foreground space-y-1">
                            {detail.changes.map((change, i) => (
                              <li key={i}>• {change}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Manual Sync Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Sync */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold mb-1">Full System Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Sync all airports in the database. This may take several minutes.
                </p>
              </div>
              <Button
                onClick={triggerFullSync}
                disabled={syncing}
                className="flex-shrink-0"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Full Sync
                  </>
                )}
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Automated weekly syncs run every Sunday at 2:00 AM UTC. Manual sync is only needed for immediate updates.
                </p>
              </div>
            </div>
          </div>

          {/* Single Airport Sync */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Sync Single Airport</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedAirport}
                onChange={(e) => setSelectedAirport(e.target.value.toUpperCase())}
                placeholder="Enter ICAO code (e.g., KTEB)"
                maxLength={4}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              />
              <Button
                onClick={syncSingleAirport}
                disabled={syncing || !selectedAirport}
                variant="outline"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Airport Sync Logs */}
          {syncLogs.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Sync History for {selectedAirport}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{formatDate(log.timestamp)}</span>
                      <span className="text-xs text-muted-foreground">{formatTimeSince(log.timestamp)}</span>
                    </div>
                    {log.changes && log.changes.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {log.changes.map((change: string, i: number) => (
                          <li key={i}>• {change}</li>
                        ))}
                      </ul>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Previous update: {log.previousUpdate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Sync Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Automated Sync Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Weekly Automatic Sync</p>
                <p className="text-sm text-muted-foreground">
                  Every Sunday at 2:00 AM UTC
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Smart Change Detection</p>
                <p className="text-sm text-muted-foreground">
                  Only updates records when actual changes are detected
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Comprehensive Data Sources</p>
                <p className="text-sm text-muted-foreground">
                  Fetches runway data, PCN numbers, tower hours, and more from FAA/AirportDB APIs
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Manual Entry Still Required</p>
                <p>
                  Some data cannot be automated and requires Airport Evaluation Officer input:
                  instrument approach procedures, FBO services, ramp weight restrictions, and company-specific notes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!lastReport && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Sync Reports Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Trigger a manual sync to start collecting airport data
            </p>
            <Button onClick={triggerFullSync} disabled={syncing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run First Sync
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
