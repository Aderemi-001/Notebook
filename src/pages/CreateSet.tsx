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
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

const CreateSet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { file, setFile, sourceTextContent, estimateOptimalCards, generateCardsAndConcepts, currentUser, isLoadingUser } = useFileImport();
  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [estimatedOptimalCards, setEstimatedOptimalCards] = useState<number | null>(null);
  const [showEstimationDialog, setShowEstimationDialog] = useState(false);
  const [numCardsToGenerate, setNumCardsToGenerate] = useState<number | undefined>(undefined);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const toastId = showLoading("Saving your study set...");

    try {
      if (!currentUser) {
        throw new Error("You must be logged in to create a set.");
      }

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
        .select('id') // Select the ID to use for card insertion
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
        .select('id, term'); // Select ID and term to map for card_concept_links

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
      form.setValue('cards', result.cards.map((card: { term: string; definition: string }) => ({ term: card.term, definition: card.definition })));
      setGeneratedCardConceptLinks(result.card_concept_links || []); // Store the links
      setShowSuccessToastAfterRender(true);
    } else {
      form.setValue('cards', [{ term: "", definition: "" }]); // Clear all and add one empty card
      showError("The AI couldn't find any terms and definitions in the file.");
    }
  };

  const isGenerateButtonDisabled = !numCardsToGenerate || numCardsToGenerate <= 0 || isGenerating || (estimatedOptimalCards !== null && numCardsToGenerate > estimatedOptimalCards);

  return (
    <div className="container mx-auto py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create a new study set</h1>
        <Button asChild variant="outline">
          <Link to="/">Back to My Sets</Link>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFile(e.target.files ? e.target.files[0] : null);
                  setEstimatedOptimalCards(null); // Clear previous estimate
                  setNumCardsToGenerate(undefined); // Clear previous input
                  setGeneratedCardConceptLinks([]); // Clear previous links
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
            <Button type="submit">Create Set</Button>
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumCardsToGenerate(parseInt(e.target.value) || undefined)}
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

export default CreateSet;