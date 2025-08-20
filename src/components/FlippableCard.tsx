import React from 'react';
import { cn } from '@/lib/utils';
import { NotebookCard } from './NotebookCard';

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
          "relative w-full h-full cursor-pointer perspective",
          className
        )}
        onClick={onClick}
      >
        <div
          className={cn(
            "absolute w-full h-full transition-transform duration-700 ease-in-out transform-gpu",
            isFlipped ? 'rotate-y-180' : 'rotate-y-0'
          )}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full backface-hidden">
            <NotebookCard className="w-full h-full flex flex-col justify-center items-center text-center">
              {frontContent}
            </NotebookCard>
          </div>

          {/* Back of the card */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180">
            <NotebookCard className="w-full h-full flex flex-col justify-center items-center text-center">
              {backContent}
            </NotebookCard>
          </div>
        </div>
      </div>
    );
  }
);

FlippableCard.displayName = "FlippableCard";

export default FlippableCard;