import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
    icon: React.ElementType;
    label: string;
    value: number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    gradient?: string;
    shadowColor?: string;
    className?: string;
    onClick?: () => void;
}

// Hook for animated counting
function useCounter(end: number, duration: number = 1000) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function for smooth stop
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end); // Ensure we hit exact number
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
}

export function MetricCard({
    icon: Icon,
    label,
    value,
    trend,
    gradient = "from-blue-500 to-blue-600",
    shadowColor = "shadow-blue-500/20",
    className = "",
    onClick
}: MetricCardProps) {
    const count = useCounter(value, 1500);

    return (
        <div
            onClick={onClick}
            className={`
        group relative overflow-hidden
        glass-premium glass-premium-hover rounded-2xl p-6 
        border-white/20 dark:border-slate-700/30
        hover:border-white/40 dark:hover:border-slate-600/50
        cursor-pointer
        ${className}
      `}
        >
            {/* Dynamic Gradient Blur Background - Expands on Hover */}
            <div className={`
        absolute -top-10 -right-10 w-32 h-32 
        bg-gradient-to-br ${gradient} 
        blur-[60px] opacity-20 group-hover:opacity-30 group-hover:scale-150 
        transition-all duration-700 ease-in-out
      `} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={`
            p-3 rounded-xl shadow-lg 
            bg-gradient-to-br ${gradient}
            transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3
          `}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground/50 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground tracking-wide">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-light text-foreground tracking-tight">
                            {count.toLocaleString()}
                        </span>
                    </div>
                    {trend && (
                        <p className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {trend}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
