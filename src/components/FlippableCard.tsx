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
          "relative w-full h-full cursor-pointer perspective-1000",
          className
        )}
        onClick={onClick}
      >
        <div
          className={cn(
            "absolute w-full h-full transition-transform duration-700 ease-in-out transform-style-3d",
            isFlipped ? 'rotate-y-180' : 'rotate-y-0'
          )}
          style={{ willChange: 'transform' }}
        >
          <div className="absolute w-full h-full backface-hidden" style={{ zIndex: isFlipped ? 1 : 2 }}>
            <div className="w-full h-full flex flex-col justify-center items-center text-center">
              {frontContent}
            </div>
          </div>

          {/* Back of the card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180" style={{ zIndex: isFlipped ? 2 : 1 }}>
            <div className="w-full h-full flex flex-col justify-center items-center text-center">
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