import React from "react";
import { Card, CardProps, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NotebookCardProps extends CardProps {
  children?: React.ReactNode;
}

const NotebookCard = ({ className, children, ...props }: NotebookCardProps) => {
  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300",
        "border border-gray-200 rounded-md", // More defined border
        "before:content-[''] before:absolute before:left-2 sm:before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-red-400", // Red margin line, responsive left
        "pl-4 sm:pl-6", // Add padding to the left for the holes and margin line, responsive padding
        className
      )}
      {...props}
    >
      {/* Hole punch effect - simplified with absolute positioned divs */}
      <div className="absolute left-0 top-0 bottom-0 w-3 sm:w-4 flex flex-col justify-around py-2">
        {Array.from({ length: 5 }).map((_, i) => ( // Adjust number of holes based on card height
          <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 rounded-full mx-auto"></div> {/* Responsive size */}
        ))}
      </div>
      {children} {/* Children will now inherit the pl-6 from the parent Card */}
    </Card>
  );
};
NotebookCard.displayName = "NotebookCard";

// Re-export sub-components for convenience
export { NotebookCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };