/**
 * Environment-aware logger utility
 * Automatically strips console.logs in production builds
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
    /**
     * Log informational messages (only in development)
     */
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log informational messages with a prefix (only in development)
     */
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    /**
     * Log warning messages (always shown)
     */
    warn: (...args: any[]) => {
        console.warn(...args);
    },

    /**
     * Log error messages (always shown)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log debug messages (only in development)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
};
