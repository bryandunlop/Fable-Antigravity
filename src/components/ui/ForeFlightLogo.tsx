import React from 'react';
import foreFlightLogo from '../../assets/foreflight_logo.webp';

export const ForeFlightLogo = ({ className, ...props }: React.ComponentProps<'img'>) => {
    return (
        <img
            src={foreFlightLogo}
            alt="ForeFlight Logo"
            className={className}
            {...props}
        />
    );
};
