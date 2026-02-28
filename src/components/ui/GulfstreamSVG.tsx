import React from 'react';

export const GulfstreamSVG = ({ className = '' }: { className?: string }) => (
    <svg viewBox="0 0 1024 682" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Sky & Clouds Background (simplified for React/Tailwind usage, or we can make it transparent) */}
        <g className="background-clouds">
            <path d="M0 0h1024v682H0z" fill="#E6EAEE" />
            <path d="M638.5 272c-15.5-26.8-45-45-78.5-45-29 0-55.5 14-71.5 35.5h-54c-11.3 0-21.5 4.6-29 12V274c0 11.6 9.4 21 21 21h212c11.6 0 21-9.4 21-21v-2h-21z" fill="#FFF" />
            <path d="M969.4 468c-1.3-43.7-37.4-78.6-81.4-78.6-42.5 0-77.5 33-81 74.8-19.1-15.5-43.2-24.8-69.5-24.8-19 0-36.9 4.8-52.5 13.4C661.1 364.5 540.8 304 402.5 304c-151 0-282 86.8-348.5 212.5C21.4 513 0 538.5 0 568.5v113.5h1024V468h-54.6z" fill="#D3E5F2" />
            <path fill="#FFF" d="M737.5 394c-8.5-40-44-70-87.5-70-43.4 0-78.9 29.8-87.5 69.8-17.1-12.8-38.3-20.8-61.5-20.8-21 0-40.4 6.5-56.5 17.5-31.5-62-97.5-104.5-173.5-104.5-66.4 0-125 34-160.5 86-9.8-3.5-20.4-5.5-31.5-5.5-35 0-65.5 18.5-82.5 46.5V682h1024V476c0-45.3-36.7-82-82-82h-.5z" />
        </g>

        {/* Gulfstream Airplane */}
        <g transform="translate(268, 175)">
            {/* Fuselage underbelly shadow */}
            <path d="M465.5 185.5c-44 14-118 36-173 37.5L160 178c-52.5-25.5-100-36.5-108.5-38.5-8.5-2-21 4.5-33.5 11l-.5 4c30.5 40 182.5 186.5 212.5 212.5 21 18.5 219.5 73.5 258 79.5 26.5 4 116.5-10 166.5-28 32-11.5 83.5-37 83.5-37" fill="#EAECEE" />

            {/* Blue stripe */}
            <path d="M37 149C16 142.5 3.5 125 2 120l3.5-4c28-9.5 83 2 110.5 12l253.5 84.5c48.5 16 109 26.5 137.5 26.5 52 0 102.5-34.5 102.5-34.5" fill="#0A3C63" />

            {/* Gold Trim */}
            <path d="M8 126c8.5.5 20.5 4.5 47 13.5l264 88c22.5 7.5 79.5 21 133 21 21.5 0 69-7 121-27" fill="#D4AF37" />

            {/* Main Body */}
            <path d="M2 120s-5-22.5 15.5-37c20-14.5 61.5-22 84-24.5l146.5 29c87.5 17.5 147.5 50.5 189 74.5 41.5 24.5 100.5 37 137.5 37 45.5 0 101.5-32 101.5-32l-1-29" fill="#FFF" />

            {/* Cockpit Windows */}
            <path d="M63.5 71.5s7-17.5 34.5-5l16 7c2 .5 0 9-3.5 11-3.5 2-30.5-8.5-47-13z" fill="#4B6A7F" />

            {/* Engine */}
            <path d="M363.5 149C354 125 369.5 112 386 112c24.5 0 45.5 14 55.5 27.5z" fill="#0A3C63" />
            <path d="M400.5 174C381 181 350.5 172 344 148v-23.5l14 8 c13 7.5 24.5 17 32 30 2 3.5 10.5 11.5 10.5 11.5" fill="#1C4B6E" />

            {/* Portholes */}
            <circle cx="120" cy="100" r="12" fill="#2E4A62" />
            <circle cx="165" cy="112" r="12" fill="#2E4A62" />
            <circle cx="210" cy="122" r="12" fill="#2E4A62" />
            <circle cx="255" cy="132" r="12" fill="#2E4A62" />
            <circle cx="300" cy="142" r="12" fill="#2E4A62" />
            <circle cx="345" cy="151" r="12" fill="#2E4A62" />

            {/* Fin/Tail */}
            <path d="M195 62l68-98 19-3s22 19 23 85l-110-3z" fill="#FFF" />
            <path d="M263-36l19-3c0 0 10 11.5 14.5 29.5l-26.5 5" fill="#0A3C63" />

            {/* Wing */}
            <path d="M236.5 197l209 157.5 45 -14-192-230.5" fill="#FFF" />
            <path d="M490.5 340.5L462 368s-7-2-20.5-15.5" fill="#0A3C63" />

            {/* Outline Strokes for Illustration Style */}
            <path d="M140.5 103C121 99 90 92.5 84 92.5M163 115l49 13M232 135l50 14" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M363.5 149C354 125 369.5 112 386 112" stroke="#000" strokeWidth="2" fill="none" />
            <path d="M2 120s-5-22.5 15.5-37M17.5 83c20-14.5 61.5-22 84-24.5" stroke="#000" strokeWidth="3" fill="none" />
            <path d="M263-36l19-3M282-39s22 19 23 85" stroke="#000" strokeWidth="2" fill="none" />
            <path d="M445.5 354.5L236.5 197M490.5 340.5L462 368M462 368l-16.5-13.5" stroke="#000" strokeWidth="2" fill="none" />
        </g>
    </svg>
);
