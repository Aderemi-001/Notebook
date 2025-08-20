import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { NotebookCard, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/NotebookCard';
import GraphVisualization from '@/components/GraphVisualization';

interface Concept {
  id: string;
  name: string;
  description: string | null;
}

interface Relationship {
  source_concept_id: string;
  target_concept_id: string;
  type: string;
  strength: number;
}

interface ConstellationData {
  concepts: Concept[];
  relationships: Relationship[];
}

const fetchCognitiveConstellation = async (): Promise<ConstellationData> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("User not authenticated.");
  }

  const response = await fetch(
    `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/re-evaluate-constellation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1b3NkbWVjbGR6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
      },
      body: JSON.stringify({}), // Empty body for this function
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data?.error || "Failed to fetch cognitive constellation data.");
  }

  return data;
};

const CognitiveConstellation = () => {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const { data, isLoading, isError, error } = useQuery<ConstellationData, Error>({
    queryKey: ['cognitiveConstellation'],
    queryFn: fetchCognitiveConstellation,
  });

  const handleSelectConcept = (concept: Concept | null) => {
    setSelectedConcept(concept);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-96 w-full rounded-lg mb-8" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading cognitive constellation: {error?.message || "Unknown error"}
      </div>
    );
  }

  const concepts = data?.concepts || [];
  const relationships = data?.relationships || [];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Cognitive Constellation</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <React.Fragment>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </React.Fragment>
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Explore the relationships between the concepts extracted from your study sets.
      </p>

      <div className="mb-8">
        <GraphVisualization
          concepts={concepts}
          relationships={relationships}
          selectedConcept={selectedConcept}
          onSelectConcept={handleSelectConcept}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Concepts ({concepts.length})</h2>
      {concepts.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No concepts found. Import some study sets with AI to generate concepts!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept) => (
            <NotebookCard
              key={concept.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectConcept(concept)}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{concept.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{concept.description || "No description available."}</CardDescription>
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      )}

      {selectedConcept && (
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Relationships for "{selectedConcept.name}"</h2>
          <NotebookCard>
            <CardContent className="pt-6">
              {relationships
                .filter(rel => rel.source_concept_id === selectedConcept.id || rel.target_concept_id === selectedConcept.id)
                .map((rel, index) => {
                  const sourceConcept = concepts.find(c => c.id === rel.source_concept_id);
                  const targetConcept = concepts.find(c => c.id === rel.target_concept_id);
                  return (
                    <div key={index} className="mb-2 text-sm">
                      <span className="font-medium">{sourceConcept?.name || 'Unknown'}</span>
                      <span className="mx-1 text-muted-foreground">({rel.type})</span>
                      <span className="font-medium">{targetConcept?.name || 'Unknown'}</span>
                      <span className="ml-2 text-xs text-muted-foreground">(Strength: {rel.strength.toFixed(1)})</span>
                    </div>
                  );
                })}
              {relationships.filter(rel => rel.source_concept_id === selectedConcept.id || rel.target_concept_id === selectedConcept.id).length === 0 && (
                <p className="text-muted-foreground">No direct relationships found for this concept.</p>
              )}
            </CardContent>
          </NotebookCard>
        </div>
      )}
    </div>
  );
};

export default CognitiveConstellation;