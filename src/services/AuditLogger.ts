export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userRole: string;
    action: string;
    resource: string;
    details?: Record<string, any>;
}

/**
 * Mock Audit Logger Service
 * In a production environment, this would send logs to a secure, append-only backend database.
 * For this localized demo, it logs to the console and localStorage.
 */
class AuditLoggerService {
    private readonly STORAGE_KEY = 'ams_audit_logs';

    log(action: string, resource: string, details?: Record<string, any>) {
        // In a real app, this would come from the auth context
        const currentUser = localStorage.getItem('user_id') || 'LeadManager1';
        const currentRole = localStorage.getItem('userRole') || 'lead';

        const entry: AuditLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: currentUser,
            userRole: currentRole,
            action,
            resource,
            details,
        };

        // 1. Log to console for developer visibility with distinctive styling
        console.log(
            `%c[AUDIT] %c${new Date().toLocaleTimeString()} | %c${currentUser} (${currentRole}) %c${action} %c${resource}`,
            'color: #f59e0b; font-weight: bold;', // Amber for AUDIT tag
            'color: #9ca3af;', // Gray text for time
            'color: #3b82f6; font-weight: bold;', // Blue for user
            'color: #ef4444; font-weight: bold;', // Red for action
            'color: #10b981;', // Green for resource
            details ? details : ''
        );

        // 2. Persist to localStorage
        this.persistLog(entry);
    }

    private persistLog(entry: AuditLogEntry) {
        try {
            const existingLogsStr = localStorage.getItem(this.STORAGE_KEY);
            const logs: AuditLogEntry[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];

            // Keep only last 500 logs to prevent unbounded localStorage growth
            if (logs.length >= 500) {
                logs.pop();
            }

            logs.unshift(entry);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to write audit log to localStorage:', e);
        }
    }

    getLogs(): AuditLogEntry[] {
        try {
            const logs = localStorage.getItem(this.STORAGE_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch (e) {
            console.error('Failed to read audit logs from localStorage:', e);
            return [];
        }
    }

    clearLogs() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('%c[AUDIT SYSTEM] %cAll local audit logs cleared.', 'color: #f59e0b; font-weight: bold;', 'color: #ef4444;');
    }
}

export const AuditLogger = new AuditLoggerService();
