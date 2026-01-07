import * as React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
    shadow?: boolean;
    glow?: boolean;
    bgWhite?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
    className,
    size = 'md',
    rounded = '2xl',
    shadow = false,
    glow = false,
}) => {
    const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
        'xs': 'h-6 w-6',
        'sm': 'h-8 w-8',
        'md': 'h-10 w-10',
        'lg': 'h-12 w-12',
        'xl': 'h-16 w-16 md:h-20 md:w-20',
        '2xl': 'h-24 w-24 md:h-32 md:w-32',
    };

    const roundedClasses: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full', string> = {
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'xl': 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        'full': 'rounded-full',
    };

    return (
        <div className={cn(
            "overflow-hidden flex items-center justify-center shrink-0 transition-all duration-500 bg-white",
            sizeClasses[size],
            roundedClasses[rounded],
            shadow && "shadow-premium",
            glow && "shadow-glow",
            className
        )}>
            <img
                src="/notebook-icon.png"
                alt="Notebook Logo"
                className="h-full w-full object-cover"
            />
        </div>
    );
};

export default BrandLogo;
