import * as React from 'react';
import { cn } from '@/lib/utils';


interface FlippableCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onClick?: () => void;
  className?: string;
}

const FlippableCard = React.forwardRef<HTMLDivElement, FlippableCardProps>(
  ({ frontContent, backContent, isFlipped, onClick, className }, ref) => {

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full cursor-pointer bg-transparent shadow-none border-none ring-0 outline-none",
          className
        )}
        onClick={onClick}
        style={{
          perspective: '2000px',
          background: 'transparent',
          boxShadow: 'none',
          minHeight: '400px' // Ensure a baseline height
        }}
      >
        <div
          className="w-full relative bg-transparent shadow-none border-none ring-0 outline-none"
          style={{
            height: '400px', // Fixed height for flippable container to avoid collapse
            transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            background: 'transparent',
            boxShadow: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 w-full h-full rounded-[2rem]"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(1px)', // Slight lift for elevation
              zIndex: isFlipped ? 1 : 2
            }}
          >
            <div className="w-full h-full flex flex-col items-stretch text-center glass-card border-white/20 dark:border-white/10 shadow-premium rounded-[2rem] overflow-hidden group-hover:translate-y-[-4px] active:scale-[0.98]">
              {frontContent}
            </div>
          </div>

          {/* Back of the card */}
          <div
            className="absolute inset-0 w-full h-full rounded-[2rem]"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(1px)',
              zIndex: isFlipped ? 2 : 1
            }}
          >
            <div className="w-full h-full flex flex-col items-stretch text-center glass-card border-white/20 dark:border-white/10 shadow-premium rounded-[2rem] overflow-hidden">
              {backContent}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FlippableCard.displayName = "FlippableCard";

export default FlippableCard;