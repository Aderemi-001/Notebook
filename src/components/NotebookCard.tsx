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
        "before:content-[''] before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-[--notebook-line-color]", // Use CSS variable
        className
      )}
      {...props}
    >
      {/* Hole punch effect */}
      <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full mx-auto bg-[--notebook-hole-color]"></div> {/* Use CSS variable */}
        ))}
      </div>
      {children}
    </Card>
  )
);
NotebookCard.displayName = "NotebookCard";

// Re-export sub-components for convenience
export { NotebookCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };