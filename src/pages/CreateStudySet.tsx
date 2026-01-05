import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import StudySetFormFields from "@/components/StudySetFormFields";
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";
import { useFileImport } from "@/hooks/use-file-import";
import { Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PremiumGate } from "@/components/PremiumGate";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
  group_id: z.string().nullable().optional(),
  cards: z.array(z.object({
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

const CreateSet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { file, setFile, sourceTextContent, generateCardsAndConcepts, currentUser, isLoadingUser, progressState, progressMessage } = useFileImport();
  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [showSuccessToastAfterRender, setShowSuccessToastAfterRender] = useState(false);
  const [generatedCardConceptLinks, setGeneratedCardConceptLinks] = useState<{ card_term: string; concept_name: string }[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: (location.state as { groupId?: string })?.groupId || null,
      cards: [],
    },
  });

  useEffect(() => {
    if (showSuccessToastAfterRender && form.getValues('cards').length > 0) {
      showSuccess(`${form.getValues('cards').length} cards imported successfully!`);
      setShowSuccessToastAfterRender(false);
    }
  }, [form.watch('cards'), showSuccessToastAfterRender]);

  // Convenience: Auto-Title from File
  useEffect(() => {
    if (file && !form.getValues('title')) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      // Capitalize first letter and replace hyphens/underscores with spaces for convenience
      const formattedTitle = fileName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());

      form.setValue('title', formattedTitle);
    }
  }, [file]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) {
      showError("Please sign up or log in first to save your study set.");
      navigate('/login');
      return;
    }

    const toastId = showLoading("Saving your study set...");

    try {
      const { data: set, error: setError } = await supabase
        .from('study_sets')
        .insert({
          title: values.title,
          description: values.description,
          user_id: currentUser.id,
          source_text: sourceTextContent,
          is_public: values.is_public,
          group_id: values.group_id,
        })
        .select('id')
        .single();

      if (setError) throw setError;

      const cardsToInsert = values.cards.map((card: { term: string; definition: string }) => ({
        set_id: set.id,
        term: card.term,
        definition: card.definition,
      }));

      const { data: insertedCards, error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert)
        .select('id, term');

      if (cardsError) throw cardsError;

      // Process and insert card_concept_links
      if (generatedCardConceptLinks.length > 0 && insertedCards) {
        const cardTermToIdMap = new Map(insertedCards.map((card: { id: string; term: string }) => [card.term, card.id]));

        const { data: existingConcepts, error: fetchConceptsError } = await supabase
          .from('concepts')
          .select('id, name')
          .eq('user_id', currentUser.id);

        if (fetchConceptsError) {
          console.error("Error fetching existing concepts for linking:", fetchConceptsError);
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
          }
        }

        if (cardConceptsToInsert.length > 0) {
          await supabase
            .from('card_concepts')
            .insert(cardConceptsToInsert);
          queryClient.invalidateQueries({ queryKey: ['cognitiveConstellation'] });
        }
      }

      dismissToast(toastId);
      showSuccess("Set created successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      queryClient.invalidateQueries({ queryKey: ['studySetsInGroup'] });
      navigate('/');

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to create set.");
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

    const result = await generateCardsAndConcepts();

    if (result && result.cards.length > 0) {
      form.setValue('cards', result.cards.map((card: { term: string; definition: string }) => ({ term: card.term, definition: card.definition })));
      setGeneratedCardConceptLinks(result.card_concept_links || []);
      setShowSuccessToastAfterRender(true);
    } else {
      if (progressState !== 'error') { // Only show this if generateCards didn't already show an error
        form.setValue('cards', [{ term: "", definition: "" }]);
        showError("The AI couldn't find any terms and definitions in the file.");
      }
    }
  };

  const getProgressValue = () => {
    switch (progressState) {
      case 'idle': return 0;
      case 'extracting': return 30;
      case 'processing': return 70;
      case 'complete': return 100;
      case 'error': return 100;
      default: return 0;
    }
  };

  if (isLoadingUser || isLoadingGroups) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Create a new study set</h1>
        <Button asChild variant="outline">
          <Link to="/">Back to My Sets</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <StudySetFormFields form={form} userGroups={userGroups} isLoadingGroups={isLoadingGroups} />

          <PremiumGate feature="AI File Import">
            <NotebookCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Import from file with Nova
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFile(e.target.files ? e.target.files[0] : null);
                      setGeneratedCardConceptLinks([]);
                    }}
                    className="w-full"
                  />

                  {progressState !== 'idle' && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{progressMessage}</span>
                        <span>{getProgressValue()}%</span>
                      </div>
                      <Progress value={getProgressValue()} className={`h-2 ${progressState === 'error' ? 'bg-red-100' : ''}`} />
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleGenerateCards}
                    disabled={!file || isLoadingUser || progressState === 'extracting' || progressState === 'processing' || !currentUser}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-300"
                  >
                    {progressState === 'extracting' || progressState === 'processing' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate Flashcards with Nova
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </NotebookCard>
          </PremiumGate>

          <FlashcardEditor form={form} />

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoadingUser || !currentUser}>
              {isLoadingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading User...
                </>
              ) : !currentUser ? (
                "Sign In to Create Set"
              ) : (
                "Create Set"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateSet;