import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface LiquidCardProps extends React.HTMLAttributes<HTMLDivElement> {
    delay?: number;
    highlight?: boolean;
}

export const LiquidCard = React.forwardRef<HTMLDivElement, LiquidCardProps>(
    ({ className, children, delay = 0, highlight = false, style, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-3xl",
                    "glass-panel text-card-foreground",
                    "glass-panel-hover",
                    "animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards",
                    highlight && "shadow-[0_0_20px_-5px_var(--color-pg-blue-vivid)] border-blue-400/20",
                    className
                )}
                style={{
                    animationDelay: `${delay}ms`,
                    ...style
                }}
                {...props}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                {children}
            </div>
        );
    }
);

LiquidCard.displayName = 'LiquidCard';
