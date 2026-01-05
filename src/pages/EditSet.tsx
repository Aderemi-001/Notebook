import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Import new modular components and hooks
import { useStudySetData } from "@/hooks/use-study-set-data";
import { useFileImport } from "@/hooks/use-file-import";
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";
import StudySetFormFields from "@/components/StudySetFormFields";
import { Loader2, Brain } from "lucide-react";
import * as React from 'react'; // Explicitly import React
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
  group_id: z.string().nullable().optional(),
  cards: z.array(z.object({
    id: z.string().optional(),
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

type EditSetFormValues = z.infer<typeof formSchema>;

const EditSet = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth(); // Get profile for admin check, 'user' is not directly used here

  const { data: studySet, isLoading, isError, error } = useStudySetData(setId);
  const { file, setFile, sourceTextContent, setSourceTextContent, generateCardsAndConcepts, currentUser, isLoadingUser } = useFileImport();

  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessToastAfterRender, setShowSuccessToastAfterRender] = useState(false);
  const [generatedCardConceptLinks, setGeneratedCardConceptLinks] = useState<{ card_term: string; concept_name: string }[]>([]);


  const form = useForm<EditSetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: null,
      cards: [],
    },
  });

  useEffect(() => {
    if (studySet) {
      form.reset({
        title: studySet.title,
        description: studySet.description || "",
        is_public: studySet.is_public,
        group_id: studySet.group_id,
        cards: studySet.cards.map((card: { id: string; term: string; definition: string }) => ({
          id: card.id,
          term: card.term,
          definition: card.definition,
        })),
      });
      setSourceTextContent(studySet.source_text);
    }
  }, [studySet, form, setSourceTextContent]);

  useEffect(() => {
    if (showSuccessToastAfterRender && form.getValues('cards').length > 0) {
      showSuccess(`${form.getValues('cards').length} cards imported successfully!`);
      setShowSuccessToastAfterRender(false);
    }
  }, [form.watch('cards'), showSuccessToastAfterRender]);

  async function onSubmit(values: EditSetFormValues) {
    if (!setId) {
      showError("Study set ID is missing.");
      return;
    }

    const toastId = showLoading("Updating your study set...");

    try {
      if (!currentUser) {
        throw new Error("You must be logged in to edit a set.");
      }

      const { error: updateSetError } = await supabase
        .from('study_sets')
        .update({
          title: values.title,
          description: values.description,
          source_text: sourceTextContent,
          is_public: values.is_public,
          group_id: values.group_id,
        })
        .eq('id', setId); // Admin RLS policy will allow this update

      if (updateSetError) throw updateSetError;

      const existingCards = values.cards.filter((card: { id?: string }) => card.id);
      const newCards = values.cards.filter((card: { id?: string }) => !card.id);

      const { data: currentDbCards, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', setId);

      if (fetchCardsError) throw fetchCardsError;

      const currentDbCardIds = new Set(currentDbCards.map((card: { id: string }) => card.id));
      const formCardIds = new Set(existingCards.map((card: { id?: string }) => card.id));

      const cardsToDelete = Array.from(currentDbCardIds).filter(dbId => !formCardIds.has(dbId));

      if (cardsToDelete.length > 0) {
        const { error: deleteCardsError } = await supabase
          .from('cards')
          .delete()
          .in('id', cardsToDelete);
        if (deleteCardsError) throw deleteCardsError;
      }

      for (const card of existingCards) {
        const { error: updateCardError } = await supabase
          .from('cards')
          .update({ term: card.term, definition: card.definition })
          .eq('id', card.id!);
        if (updateCardError) throw updateCardError;
      }

      let insertedNewCards: { id: string; term: string }[] | null = null;
      if (newCards.length > 0) {
        const cardsToInsert = newCards.map((card: { term: string; definition: string }) => ({
          set_id: setId,
          term: card.term,
          definition: card.definition,
        }));
        const { data: insertedData, error: insertCardsError } = await supabase
          .from('cards')
          .insert(cardsToInsert)
          .select('id, term');
        if (insertCardsError) throw insertCardsError;
        insertedNewCards = insertedData;
      }

      // Process and insert card_concept_links
      if (generatedCardConceptLinks.length > 0) {
        const allCardsInSet = [...(studySet?.cards || []), ...(insertedNewCards || [])];
        const cardTermToIdMap = new Map(allCardsInSet.map((card: { id: string; term: string }) => [card.term, card.id]));

        const { data: existingConcepts, error: fetchConceptsError } = await supabase
          .from('concepts')
          .select('id, name')
          .eq('user_id', currentUser.id);

        if (fetchConceptsError) {
          console.error("Error fetching existing concepts for linking:", fetchConceptsError);
          // Continue without linking if concepts can't be fetched
        }

        const conceptNameToIdMap = new Map(existingConcepts?.map((c: { id: string; name: string }) => [c.name, c.id]));

        const cardConceptsToInsert = [];
        for (const link of generatedCardConceptLinks) {
          const cardId = cardTermToIdMap.get(link.card_term);
          const conceptId = conceptNameToIdMap.get(link.concept_name);

          if (cardId && conceptId) {
            cardConceptsToInsert.push({
              user_id: currentUser.id,
              card_id: cardId,
              concept_id: conceptId,
            });
          } else {
            console.warn(`Could not find ID for card term "${link.card_term}" or concept name "${link.concept_name}" for linking.`);
          }
        }

        if (cardConceptsToInsert.length > 0) {
          const { error: insertCardConceptsError } = await supabase
            .from('card_concepts')
            .insert(cardConceptsToInsert);

          if (insertCardConceptsError) {
            console.error("Error inserting card-concept links:", insertCardConceptsError);
          } else {
            queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
          }
        }
      }

      dismissToast(toastId);
      showSuccess("Study set updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      queryClient.invalidateQueries({ queryKey: ['studySetsInGroup'] });
      navigate(`/sets/${setId}`);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to update set.");
      console.error(error);
    }
  }

  function onError(errors: any) {
    console.error(errors);
    showError("Please fix the errors before submitting.");
  }

  const handleGenerateCards = async () => {
    if (!file) {
      showError("Please select a file first.");
      return;
    }
    if (!currentUser) {
      showError("Please sign up or log in first to use AI features.");
      navigate('/login');
      return;
    }

    setIsGenerating(true);
    const result = await generateCardsAndConcepts();
    setIsGenerating(false);

    if (result && result.cards.length > 0) {
      form.setValue('cards', result.cards.map((card: { term: string; definition: string }) => ({ id: undefined, term: card.term, definition: card.definition })));
      setGeneratedCardConceptLinks(result.card_concept_links || []);
      setShowSuccessToastAfterRender(true);
    } else {
      form.setValue('cards', [{ id: undefined, term: "", definition: "" }]);
      showError("The AI couldn't find any terms and definitions in the file.");
    }
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        No study set ID provided for editing.
      </div>
    );
  }

  if (isLoading || isLoadingUser || isLoadingGroups) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading study set for editing: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center animate-fade-in">
        Study set not found.
      </div>
    );
  }

  // Restrict access if not owner and not admin
  if (!studySet.is_owner && !profile?.is_admin) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        You do not have permission to edit this study set.
        <Button asChild className="mt-4">
          <Link to={`/sets/${setId}`}>Back to Set Details</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Study Set</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <React.Fragment>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set Details
            </React.Fragment>
          </Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <StudySetFormFields form={form} userGroups={userGroups} isLoadingGroups={isLoadingGroups} />

          <NotebookCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-500" />
                Import from file with Nova
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                type="file"
                accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFile(e.target.files ? e.target.files[0] : null);
                  setGeneratedCardConceptLinks([]); // Clear previous links
                }}
                className="w-full"
              />
              <Button
                type="button"
                onClick={handleGenerateCards}
                disabled={!file || isLoadingUser || !currentUser || isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Nova is generating flashcards...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" /> Generate Flashcards with Nova
                  </>
                )}
              </Button>
            </CardContent>
          </NotebookCard>

          <FlashcardEditor form={form} />

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>


    </div >
  );
};

export default EditSet;