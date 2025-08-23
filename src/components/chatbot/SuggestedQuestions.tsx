import * as React from 'react'; // Explicitly import React
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface SuggestedQuestionsProps {
  suggestions: string[];
  onQuestionClick: (question: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ suggestions, onQuestionClick }) => {
  return (
    <div className="mt-4 p-2 border rounded-md bg-muted/20">
      <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
        <Lightbulb className="h-4 w-4 mr-2" /> Suggested Questions:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((question: string, index: number) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuestionClick(question)}
            className="h-auto py-1.5 px-3 text-xs whitespace-normal text-left"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;