import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
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
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Brain } from "lucide-react";

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
  const { file, setFile, sourceTextContent, setSourceTextContent, estimateOptimalCards, generateCardsAndConcepts, currentUser, isLoadingUser } = useFileImport();

  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [estimatedOptimalCards, setEstimatedOptimalCards] = useState<number | null>(null);
  const [showEstimationDialog, setShowEstimationDialog] = useState(false);
  const [numCardsToGenerate, setNumCardsToGenerate] = useState<number | undefined>(undefined);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessToastAfterRender, setShowSuccessToastAfterRender] = useState(false);

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

  const handleEstimateCards = async () => {
    if (!file) {
      showError("Please select a file first.");
      return;
    }
    setIsEstimating(true);
    const optimalCount = await estimateOptimalCards();
    setIsEstimating(false);
    if (optimalCount !== null) {
      setEstimatedOptimalCards(optimalCount);
      setNumCardsToGenerate(optimalCount); // Pre-fill with suggested count
      setShowEstimationDialog(true);
    }
  };

  const handleConfirmGenerate = async () => {
    setShowEstimationDialog(false);
    setIsGenerating(true);
    const result = await generateCardsAndConcepts(numCardsToGenerate);
    setIsGenerating(false);

    if (result && result.cards.length > 0) {
      form.setValue('cards', result.cards.map(card => ({ id: undefined, term: card.term, definition: card.definition })));
      setShowSuccessToastAfterRender(true);
    } else {
      if (form.getValues('cards').length === 0) {
        form.setValue('cards', [{ id: undefined, term: "", definition: "" }]);
      }
      showError("The AI couldn't find any terms and definitions in the file.");
    }
  };

  const isGenerateButtonDisabled = !numCardsToGenerate || numCardsToGenerate <= 0 || isGenerating || (estimatedOptimalCards !== null && numCardsToGenerate > estimatedOptimalCards);

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
                onChange={(e) => {
                  setFile(e.target.files ? e.target.files[0] : null);
                  setEstimatedOptimalCards(null);
                  setNumCardsToGenerate(undefined);
                }}
                className="w-full"
              />
              <Button
                type="button"
                onClick={handleEstimateCards}
                disabled={!file || isLoadingUser || !currentUser || isEstimating || isGenerating}
                className="w-full"
              >
                {isEstimating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Estimating...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" /> Estimate Cards with AI
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

      <AlertDialog open={showEstimationDialog} onOpenChange={setShowEstimationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Card Generation Suggestion</AlertDialogTitle>
            <AlertDialogDescription>
              The AI suggests generating up to <span className="font-bold text-primary">{estimatedOptimalCards}</span> high-quality cards from your content.
              How many cards would you like to generate?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="dialog-num-cards">Number of Cards</Label>
            <Input
              id="dialog-num-cards"
              type="number"
              min="1"
              max={estimatedOptimalCards !== null ? estimatedOptimalCards : undefined} // Set max attribute
              value={numCardsToGenerate || ''}
              onChange={(e) => setNumCardsToGenerate(parseInt(e.target.value) || undefined)}
              placeholder="Enter desired number"
            />
            {numCardsToGenerate !== undefined && estimatedOptimalCards !== null && numCardsToGenerate > estimatedOptimalCards && (
              <p className="text-sm text-destructive">
                You cannot request more than {estimatedOptimalCards} cards.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEstimationDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate} disabled={isGenerateButtonDisabled}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                `Generate ${numCardsToGenerate || 0} Cards`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditSet;