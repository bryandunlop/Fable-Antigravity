/**
 * Type definition for a Delay/AOG Alert
 */
export interface OperationalAlert {
    id: string;
    airport: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    delay: string;
    impact: string;
    affectedFlight: string;
    timestamp: string;
}

/**
 * Mock Real-Time Alert Service
 * Simulates a WebSocket connection to the backend that pushes
 * operational alerts (AOG, Weather, ATC Delays) to the frontend.
 */
class RealTimeAlertService {
    private intervals: NodeJS.Timeout[] = [];
    private listeners: ((alert: OperationalAlert) => void)[] = [];

    // Data pools for generating realistic mock alerts
    private airports = ['KJFK', 'KTEB', 'KMIA', 'KLAS', 'KSFO', 'EGLL', 'LFPB'];
    private flights = ['FLT001', 'FLT002', 'FLT003', 'FLT005', 'FLT007'];
    private delayTypes = ['Weather', 'GDP', 'Capacity', 'Maintenance', 'Crew'];

    /**
     * Subscribe to incoming alerts
     * @param callback Function to execute when a new alert arrives
     * @returns Unsubscribe function
     */
    subscribe(callback: (alert: OperationalAlert) => void): () => void {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Start the simulation
     * Randomly pushes a new alert every 30 to 90 seconds.
     */
    connect() {
        console.log('%c[WS CONNECTED] %cMock Real-Time Alert Service initialized.', 'color: #10b981; font-weight: bold;', 'color: #6b7280;');

        // Clear any existing intervals if re-connecting
        this.disconnect();

        const pushRandomAlert = () => {
            const alert = this.generateRandomAlert();
            this.listeners.forEach(listener => listener(alert));

            // Schedule the next one randomly between 30 and 90 seconds
            const nextInterval = Math.floor(Math.random() * 60000) + 30000;
            this.intervals.push(setTimeout(pushRandomAlert, nextInterval));
        };

        // Start the first cycle
        this.intervals.push(setTimeout(pushRandomAlert, 5000)); // First one happens quickly for demo
    }

    /**
     * Stop the simulation
     */
    disconnect() {
        this.intervals.forEach(clearTimeout);
        this.intervals = [];
    }

    private generateRandomAlert(): OperationalAlert {
        const airport = this.airports[Math.floor(Math.random() * this.airports.length)];
        const flight = this.flights[Math.floor(Math.random() * this.flights.length)];
        const type = this.delayTypes[Math.floor(Math.random() * this.delayTypes.length)];

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let delayMin = Math.floor(Math.random() * 45) + 15;
        let impact = '';

        if (type === 'Maintenance') {
            severity = Math.random() > 0.5 ? 'high' : 'critical';
            delayMin = Math.floor(Math.random() * 240) + 60; // 1 to 4 hours
            impact = `AOG: Unscheduled maintenance event for ${flight}`;
        } else if (type === 'Weather') {
            severity = Math.random() > 0.7 ? 'high' : 'medium';
            impact = `Convective activity forcing reroutes. Affecting ${flight}`;
        } else if (type === 'GDP') {
            severity = 'medium';
            impact = `ATC Ground Delay Program in effect. Departure delayed.`;
        } else {
            severity = 'low';
            impact = `Minor ground service delays at ${airport}.`;
        }

        return {
            id: `live-${crypto.randomUUID().split('-')[0]}`,
            airport,
            type,
            severity,
            delay: type === 'Maintenance' && severity === 'critical' ? 'Indefinite' : `${delayMin} min`,
            impact,
            affectedFlight: flight,
            timestamp: new Date().toISOString()
        };
    }
}

export const AlertStream = new RealTimeAlertService();
