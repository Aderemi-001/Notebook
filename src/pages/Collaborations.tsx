import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Hammer } from 'lucide-react';

const Collaborations: React.FC = () => {
  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Collaborations</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <NotebookCard className="text-center py-20">
        <CardHeader className="flex flex-col items-center">
          <Hammer className="h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-2xl font-semibold">Under Construction!</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            We're working hard to bring you exciting collaboration features.
            Please check back soon!
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
            </Link>
          </Button>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Collaborations;