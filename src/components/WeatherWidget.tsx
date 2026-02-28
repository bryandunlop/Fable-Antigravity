import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock } from 'lucide-react';
import { RadarSpinner } from './ui/LoadingSpinners';

export default function WeatherWidget() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Card className="mb-6 border-none shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm relative overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between min-h-[88px]">
                {isLoading ? (
                    <div className="w-full flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                        <RadarSpinner size={32} />
                        <span className="text-sm font-medium">Scanning Weather Systems...</span>
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-between animate-fade-in">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                                {/* Custom SVG Weather Icon (Partly Cloudy) */}
                                <div className="relative w-12 h-12 flex-shrink-0 animate-[pulse-subtle_4s_ease-in-out_infinite]">
                                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                                        {/* Sun */}
                                        <circle cx="32" cy="24" r="14" fill="#fbbf24" />
                                        {/* Sun Rays */}
                                        <path d="M32 4L32 8M32 40L32 44M52 24L48 24M16 24L12 24M46.1421 9.85786L43.3137 12.6863M20.6863 35.3137L17.8579 38.1421M46.1421 38.1421L43.3137 35.3137M20.6863 12.6863L17.8579 9.85786" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                                        {/* Cloud overlay */}
                                        <path d="M44 48H20C15.5817 48 12 44.4183 12 40C12 35.5817 15.5817 32 20 32C20.6548 32 21.2885 32.083 21.8953 32.2384C23.6358 27.536 28.3262 24 34 24C40.6274 24 46 29.3726 46 36C46 36.6342 45.95 37.2568 45.854 37.8633C49.3361 38.4552 52 41.5031 52 45.1429C52 49.4821 48.4183 53 44 53" fill="currentColor" className="text-white dark:text-slate-200 drop-shadow-sm" />
                                    </svg>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-sm py-0.5 px-2 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                            KLUK
                                        </Badge>
                                        <div className="font-semibold text-lg leading-none">Cincinnati Muni</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        14:53Z Updates in 7m
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 text-sm">
                            <div className="flex gap-3">
                                <div className="text-muted-foreground font-medium self-center">METAR</div>
                                <div className="font-mono bg-background/50 p-2 rounded border border-border/50 text-foreground/90">
                                    KLUK 241453Z 31010KT 10SM CLR 05/M02 A3012
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="text-muted-foreground font-medium self-center">TAF</div>
                                <div className="font-mono bg-background/50 p-2 rounded border border-border/50 text-foreground/90">
                                    KLUK 241120Z 2412/2512 30008KT P6SM SKC FM241800 32012KT
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
