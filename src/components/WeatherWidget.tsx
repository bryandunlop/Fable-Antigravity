import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock } from 'lucide-react';

export default function WeatherWidget() {
    return (
        <Card className="mb-6 border-none shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg py-1 px-3 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            KLUK
                        </Badge>
                        <div>
                            <div className="font-semibold text-lg leading-none">Cincinnati Muni</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                14:53Z
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
            </CardContent>
        </Card>
    );
}
