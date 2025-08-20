import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface CardItem {
  id: string;
  term: string;
  definition: string;
}

const fetchCardsForStudySet = async (setId: string): Promise<CardItem[]> => {
  const { data, error } = await supabase
    .from('cards')
    .select('id, term, definition')
    .eq('set_id', setId)
    .order('created_at', { ascending: true }); // Order for consistent study flow

  if (error) {
    console.error("Error fetching cards for study set:", error);
    throw new Error("Failed to fetch cards.");
  }
  return data || [];
};

const StudyMode = () => {
  const { setId } = useParams<{ setId: string }>();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);

  const { data: cards, isLoading, isError, error } = useQuery<CardItem[], Error>({
    queryKey: ['studyCards', setId],
    queryFn: () => fetchCardsForStudySet(setId!),
    enabled: !!setId,
  });

  const currentCard = cards?.[currentCardIndex];

  const handleFlipCard = () => {
    setShowDefinition(!showDefinition);
  };

  const handleNextCard = () => {
    if (currentCardIndex < (cards?.length || 0) - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setShowDefinition(false); // Reset to show term for next card
    } else {
      setStudyFinished(true);
    }
  };

  const handleRestartStudy = () => {
    setCurrentCardIndex(0);
    setShowDefinition(false);
    setStudyFinished(false);
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No study set ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center">
        <Skeleton className="h-10 w-3/4 mb-8" />
        <Skeleton className="h-64 w-full max-w-md rounded-lg" />
        <div className="flex gap-4 mt-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-muted-foreground">This study set has no cards yet.</p>
        <Button asChild className="mt-4">
          <Link to={`/sets/${setId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set Details
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Study Mode</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set
          </Link>
        </Button>
      </div>

      {studyFinished ? (
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="mb-4">Study Session Complete!</CardTitle>
          <CardContent>
            <p className="text-lg mb-6">You've reviewed all {cards.length} cards in this set.</p>
            <Button onClick={handleRestartStudy}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restart Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card
            className="w-full max-w-md h-64 flex flex-col justify-center items-center text-center cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-105"
            onClick={handleFlipCard}
          >
            <CardHeader>
              <CardTitle className="text-2xl">
                {showDefinition ? "Definition" : "Term"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-6">
              <p className="text-xl font-medium">
                {showDefinition ? currentCard?.definition : currentCard?.term}
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 flex gap-4">
            <Button onClick={handleFlipCard} variant="outline">
              Flip Card
            </Button>
            <Button onClick={handleNextCard}>
              {currentCardIndex === cards.length - 1 ? "Finish Study" : "Next Card"}
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Card {currentCardIndex + 1} of {cards.length}
          </p>
        </>
      )}
    </div>
  );
};

export default StudyMode;