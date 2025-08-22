import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
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
import { useFileImport } from "@/hooks/use-file-import"; // Import the hook
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";
import StudySetFormFields from "@/components/StudySetFormFields";

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

  const { data: studySet, isLoading, isError, error } = useStudySetData(setId);
  const { file, setFile, sourceTextContent, setSourceTextContent, handleFileImport, currentUser, isLoadingUser, optimalMaxCards, setOptimalMaxCards } = useFileImport(); // Use the hook

  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [numCardsToGenerate, setNumCardsToGenerate] = useState<number | undefined>(undefined);

  const form = useForm<EditSetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: null,
      cards: [], // Initialize with an empty array
    },
  });

  const { append } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  useEffect(() => {
    if (studySet) {
      form.reset({
        title: studySet.title,
        description: studySet.description || "",
        is_public: studySet.is_public,
        group_id: studySet.group_id,
        cards: studySet.cards.map(card => ({
          id: card.id,
          term: card.term,
          definition: card.definition,
        })),
      });
      setSourceTextContent(studySet.source_text);
    }
  }, [studySet, form, setSourceTextContent]);

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
        .eq('id', setId);

      if (updateSetError) throw updateSetError;

      const existingCards = values.cards.filter(card => card.id);
      const newCards = values.cards.filter(card => !card.id);

      const { data: currentDbCards, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', setId);

      if (fetchCardsError) throw fetchCardsError;

      const currentDbCardIds = new Set(currentDbCards.map(card => card.id));
      const formCardIds = new Set(existingCards.map(card => card.id));

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
          .eq('id', card.id);
        if (updateCardError) throw updateCardError;
      }

      if (newCards.length > 0) {
        const cardsToInsert = newCards.map(card => ({
          set_id: setId,
          term: card.term,
          definition: card.definition,
        }));
        const { error: insertCardsError } = await supabase
          .from('cards')
          .insert(cardsToInsert);
        if (insertCardsError) throw insertCardsError;
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

  const handleImportAndAppendCards = async () => {
    // Reset optimalMaxCards before new import
    setOptimalMaxCards(null);
    const result = await handleFileImport(numCardsToGenerate); // Pass desired number of cards
    if (result && result.cards.length > 0) {
      // Clear all existing cards first, then append new ones
      form.setValue('cards', []);
      result.cards.forEach(card => {
        append({ term: card.term, definition: card.definition });
      });
    } else if (form.getValues('cards').length === 0) {
      // If no cards were imported and there are no cards in the form, add one empty card
      append({ term: "", definition: "" });
    }
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        No study set ID provided for editing.
      </div>
    );
  }

  if (isLoading || isLoadingUser || isLoadingGroups) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
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
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading study set for editing: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        Study set not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Study Set</h1>
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
              <CardTitle>Import from file with AI</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                type="file"
                accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full"
              />
              <FormField
                control={form.control}
                name="numCardsToGenerate" // This field is not part of the final schema, but used for input
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Flashcards to Generate (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Optimal number if left blank" 
                        min="1"
                        value={numCardsToGenerate || ''}
                        onChange={(e) => setNumCardsToGenerate(parseInt(e.target.value) || undefined)}
                        disabled={!file || isLoadingUser || !currentUser}
                      />
                    </FormControl>
                    {optimalMaxCards !== null && (
                      <FormDescription>
                        AI suggests up to {optimalMaxCards} high-quality cards from this content.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                onClick={handleImportAndAppendCards}
                disabled={!file || isLoadingUser || !currentUser}
                className="w-full"
              >
                {isLoadingUser ? "Loading user..." : "Import with AI"}
              </Button>
            </CardContent>
          </NotebookCard>

          <FlashcardEditor form={form} />

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditSet;