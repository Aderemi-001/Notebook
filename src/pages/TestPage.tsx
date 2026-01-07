import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

const TestPage: React.FC = () => {
  console.log("TestPage component is rendering.");
  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 text-center animate-fade-in">
      <h1 className="text-3xl font-bold mb-4">Test Page</h1>
      <p className="text-lg text-muted-foreground mb-6">
        If you see this, routing is working!
      </p>
      <Button asChild variant="outline">
        <Link to="/" className="flex items-center mx-auto w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Link>
      </Button>
    </div>
  );
};

export default TestPage;