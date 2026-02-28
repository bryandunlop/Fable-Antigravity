import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from './ui/utils';

export default function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div
            className={cn(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out flex justify-center pointer-events-none",
                isOnline ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
            )}
        >
            <div className="bg-destructive/90 backdrop-blur-md text-destructive-foreground px-6 py-2 rounded-b-xl shadow-lg border-b border-x border-destructive-foreground/20 flex items-center gap-3">
                <WifiOff className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">You are currently offline. Displaying cached data.</span>
            </div>
        </div>
    );
}
