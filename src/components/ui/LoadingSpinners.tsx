import React from 'react';

// Sweeping Radar SVG Spinner
export const RadarSpinner = ({ size = 24, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`animate-spin-slow ${className}`}
        style={{ animationDuration: '3s' }}
    >
        {/* Background Radar Rings */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />

        {/* Crosshairs */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.2" />

        {/* Sweeping Beam */}
        <path
            d="M50,50 L50,5 A45,45 0 0,1 95,50 Z"
            fill="currentColor"
            opacity="0.2"
        />
        <line x1="50" y1="50" x2="50" y2="5" stroke="currentColor" strokeWidth="2" />
        {/* Blip */}
        <circle cx="70" cy="30" r="3" fill="currentColor" className="animate-pulse" />
    </svg>
);

// Winding Altimeter SVG Spinner
export const AltimeterSpinner = ({ size = 24, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
    >
        {/* Dial Face */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />

        {/* Tick Marks */}
        <path d="M50 10 L50 15 M90 50 L85 50 M50 90 L50 85 M10 50 L15 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M22 22 L27 27 M78 22 L73 27 M78 78 L73 73 M22 78 L27 73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

        {/* Center Pin */}
        <circle cx="50" cy="50" r="4" fill="currentColor" />

        {/* Fast Needle (Minutes) */}
        <g className="animate-spin" style={{ transformOrigin: '50px 50px', animationDuration: '1s' }}>
            <path d="M50 50 L50 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Slow Needle (Hours) */}
        <g className="animate-spin" style={{ transformOrigin: '50px 50px', animationDuration: '12s' }}>
            <path d="M50 50 L70 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </g>
    </svg>
);
