import React, { useState } from 'react';
import { Button, ButtonProps } from './button';
import { Plane, Check } from 'lucide-react';
import { cn } from './utils';

export function FlightPathButton({ children, onClick, className, ...props }: ButtonProps) {
    const [status, setStatus] = useState<'idle' | 'flying' | 'done'>('idle');

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (status !== 'idle') return;
        setStatus('flying');

        // Allow user onClick to fire
        if (onClick) {
            await onClick(e);
        }

        setTimeout(() => setStatus('done'), 1000);
        setTimeout(() => setStatus('idle'), 2500);
    };

    return (
        <Button
            className={cn("relative overflow-hidden transition-all duration-300", className, status === 'done' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' : '')}
            onClick={handleClick}
            {...props}
        >
            <div className={cn("transition-opacity duration-300 flex items-center justify-center gap-2", status !== 'idle' ? 'opacity-0' : 'opacity-100')}>
                {children}
            </div>

            {status === 'flying' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Plane className="w-5 h-5 text-current animate-[fly-across_1s_ease-in-out_forwards]" />
                </div>
            )}

            {status === 'done' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                    <Check className="w-5 h-5" />
                </div>
            )}
        </Button>
    );
}
