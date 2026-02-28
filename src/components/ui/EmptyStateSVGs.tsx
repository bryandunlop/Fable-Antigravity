import React from 'react';

export function ClearSkiesSVG({ className = "", size = 64 }: { className?: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Cloud 1 */}
            <path
                d="M25 65C19.4772 65 15 60.5228 15 55C15 49.6974 19.1245 45.3563 24.3364 45.0346C25.6883 39.3872 30.7381 35 36.6667 35C43.0827 35 48.3371 39.9272 48.9723 46.2081C49.9576 45.4206 51.1895 44.9459 52.5 44.9459C55.6022 44.9459 58.1561 47.2882 58.4687 50.3168C62.7483 51.2721 66 55.074 66 59.5C66 64.7467 61.7467 69 56.5 69H25V65Z"
                fill="currentColor"
                className="text-white dark:text-slate-800 drop-shadow-sm"
                opacity="0.8"
            />

            {/* Cloud 2 */}
            <path
                d="M75 40C72.2386 40 70 37.7614 70 35C70 32.3487 71.9372 30.1782 74.5432 30.0173C75.2192 27.1936 77.7441 25 80.7083 25C83.9164 25 86.5436 27.4636 86.8611 30.604C87.3538 30.2103 87.9698 29.973 88.625 29.973C90.1761 29.973 91.453 31.1441 91.6094 32.6584C93.7492 33.136 95.375 35.037 95.375 37.25C95.375 39.8734 93.2484 42 90.625 42H75V40Z"
                fill="currentColor"
                className="text-white dark:text-slate-800 drop-shadow-sm"
                opacity="0.6"
            />

            {/* Sun/Moon */}
            <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="text-primary opacity-30 animate-[spin_30s_linear_infinite]"
            />

            {/* Paper Airplane swoosh */}
            <path
                d="M10 80C30 80 50 65 70 50"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 4"
                className="text-primary opacity-50"
            />

            {/* Paper Airplane */}
            <path
                d="M68 52L85 40L75 58L68 52Z"
                fill="currentColor"
                className="text-primary animate-pulse"
            />
        </svg>
    );
}

export function HangarEmptySVG({ className = "", size = 64 }: { className?: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Hangar Outline */}
            <path
                d="M10 70V40C10 23.4315 23.4315 10 40 10H60C76.5685 10 90 23.4315 90 40V70"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-slate-300 dark:text-slate-700"
            />

            {/* Runway lines */}
            <line x1="20" y1="80" x2="40" y2="80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-400 dark:text-slate-600" />
            <line x1="60" y1="80" x2="80" y2="80" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-slate-400 dark:text-slate-600" />

            {/* Simple Plane Tail inside matching hangar */}
            <path
                d="M50 35V65M50 35L40 55H60L50 35Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinejoin="round"
                className="text-primary opacity-50"
            />
        </svg>
    );
}
