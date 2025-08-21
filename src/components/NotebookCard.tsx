import React from "react";
import { Card, CardProps, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NotebookCardProps extends CardProps {
  children?: React.ReactNode;
}

const NotebookCard = React.forwardRef<HTMLDivElement, NotebookCardProps>(
  ({ className, children, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        "relative shadow-lg hover:shadow-xl transition-shadow duration-300",
        "border border-gray-200 rounded-md",
        className // Apply external className here
      )}
      {...props}
    >
      {/* Hole punch effect */}
      <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-2 h-2 bg-gray-300 rounded-full mx-auto"></div>
        ))}
      </div>
      {/* Red margin line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-red-400"></div>
      
      {/* Content wrapper with padding */}
      <div className="pl-10"> {/* This div now applies the left padding to all children */}
        {children}
      </div>
    </Card>
  )
);
NotebookCard.displayName = "NotebookCard";

// Re-export sub-components for convenience
export { NotebookCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };