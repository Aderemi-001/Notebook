import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as React from 'react';
import { useState } from 'react';

interface Concept {
  id: string;
  name: string;
  description: string | null;
}

interface Relationship {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  type: string;
  strength: number;
}

interface CardConceptLink {
  card_id: string;
  concept_id: string;
}

interface ConstellationData {
  concepts: Concept[];
  relationships: Relationship[];
  cardConceptLinks: CardConceptLink[];
}

const fetchConstellationData = async (): Promise<ConstellationData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: concepts, error: conceptsError } = await supabase
    .from('concepts')
    .select('*')
    .eq('user_id', user.id);

  if (conceptsError) throw conceptsError;

  const { data: relationships, error: relationshipsError } = await supabase
    .from('concept_relationships')
    .select('*')
    .eq('user_id', user.id);

  if (relationshipsError) throw relationshipsError;

  const { data: cardConceptLinks, error: cardConceptLinksError } = await supabase
    .from('card_concepts')
    .select('card_id, concept_id')
    .eq('user_id', user.id);

  if (cardConceptLinksError) throw cardConceptLinksError;

  return {
    concepts: concepts || [],
    relationships: relationships || [],
    cardConceptLinks: cardConceptLinks || [],
  };
};

const CognitiveConstellation: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<ConstellationData, Error>({
    queryKey: ['cognitiveConstellation'],
    queryFn: fetchConstellationData,
  });

  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const handleRefreshConstellation = async () => {
    const toastId = showLoading("Re-evaluating your cognitive constellation...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/re-evaluate-constellation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            // 'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU", // Removed apikey
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to re-evaluate constellation.");
      }

      showSuccess("Cognitive constellation refreshed successfully!");
      queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during refresh.");
      console.error("Refresh constellation error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4 mt-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (isError) {
    showError(error?.message || "Failed to load cognitive constellation.");
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading cognitive constellation: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!data || data.concepts.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Cognitive Constellation</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/" className="flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRefreshConstellation} className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Constellation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No concepts found yet!</h2>
          <p className="text-muted-foreground mt-2">
            Import text files with AI on the "Create Set" or "Edit Set" pages to generate your cognitive constellation.
          </p>
        </div>
      </div>
    );
  }

  const { concepts, relationships } = data;

  const conceptMap = new Map<string, Concept>(concepts.map((c: Concept) => [c.id, c]));

  return (
    <div className="container mx-auto py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Cognitive Constellation</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRefreshConstellation} className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Constellation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Explore the interconnected web of concepts extracted from your study material. Click on a concept to see its details and relationships.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <NotebookCard className="h-full">
            <CardHeader>
              <CardTitle>Your Concepts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {concepts.map((concept: Concept) => (
                <Button
                  key={concept.id}
                  variant={selectedConcept?.id === concept.id ? "default" : "outline"}
                  onClick={() => setSelectedConcept(concept)}
                  className="justify-start text-left h-auto py-2 px-3"
                >
                  {concept.name}
                </Button>
              ))}
            </CardContent>
          </NotebookCard>
        </div>

        <div className="col-span-1">
          <NotebookCard className="h-full">
            <CardHeader>
              <CardTitle>Concept Details</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {selectedConcept ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{selectedConcept.name}</h3>
                  {selectedConcept.description && (
                    <p className="text-muted-foreground text-sm">{selectedConcept.description}</p>
                  )}
                  <h4 className="text-lg font-medium mt-4">Relationships:</h4>
                  {relationships.filter((r: Relationship) => r.source_concept_id === selectedConcept.id || r.target_concept_id === selectedConcept.id).length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {relationships
                        .filter((r: Relationship) => r.source_concept_id === selectedConcept.id)
                        .map((r: Relationship) => (
                          <li key={r.id}>
                            <span className="font-semibold">{selectedConcept.name}</span>{' '}
                            <span className="text-muted-foreground">({r.type})</span>{' '}
                            <span className="font-semibold">{conceptMap.get(r.target_concept_id)?.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({(r.strength * 100).toFixed(0)}% strength)</span>
                          </li>
                        ))}
                      {relationships
                        .filter((r: Relationship) => r.target_concept_id === selectedConcept.id && r.source_concept_id !== selectedConcept.id)
                        .map((r: Relationship) => (
                          <li key={r.id}>
                            <span className="font-semibold">{conceptMap.get(r.source_concept_id)?.name}</span>{' '}
                            <span className="text-muted-foreground">({r.type} to)</span>{' '}
                            <span className="font-semibold">{selectedConcept.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({(r.strength * 100).toFixed(0)}% strength)</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No relationships found for this concept.</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Select a concept to view its details.</p>
              )}
            </CardContent>
          </NotebookCard>
        </div>
      </div>
    </div>
  );
};

export default CognitiveConstellation;