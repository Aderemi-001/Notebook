import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

const BrandLogo: React.FC<BrandLogoProps> = ({
    className,
    size = 'md',
    rounded = 'lg'
}) => {
    const sizeClasses = {
        'xs': 'h-6 w-6',
        'sm': 'h-8 w-8',
        'md': 'h-10 w-10',
        'lg': 'h-12 w-12',
        'xl': 'h-16 w-16 md:h-20 md:w-20',
        '2xl': 'h-24 w-24 md:h-32 md:w-32',
    };

    const roundedClasses = {
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'xl': 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        'full': 'rounded-full',
    };

    // Higher scale for larger sizes to ensure concealment of artifacts
    const scaleClass = size === 'xl' || size === '2xl' ? 'scale-[1.50]' : 'scale-115';

    return (
        <div className={cn(
            "overflow-hidden flex items-center justify-center bg-white shrink-0",
            sizeClasses[size],
            roundedClasses[rounded],
            className
        )}>
            <img
                src="/notebook-icon.png"
                alt="Notebook Logo"
                className={cn("h-full w-full object-cover", scaleClass)}
            />
        </div>
    );
};

export default BrandLogo;
