import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import StudySetFormFields from "@/components/StudySetFormFields";
import FlashcardEditor from "@/components/FlashcardEditor";
import { useStudySetGroups } from "@/hooks/use-study-set-groups";
import { useFileImport } from "@/hooks/use-file-import"; // Import the hook
import { Label } from "@/components/ui/label"; // Import Label for consistency

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

  const { file, setFile, sourceTextContent, handleFileImport, currentUser, isLoadingUser, optimalMaxCards, setOptimalMaxCards } = useFileImport();
  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const [numCardsToGenerate, setNumCardsToGenerate] = useState<number | undefined>(undefined);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: (location.state as { groupId?: string })?.groupId || null,
      cards: [], // Initialize with an empty array
    },
  });

  const { append } = useFieldArray({
    control: form.control,
    name: "cards",
  });

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
        .select()
        .single();

      if (setError) throw setError;

      const cardsToInsert = values.cards.map(card => ({
        set_id: set.id,
        term: card.term,
        definition: card.definition,
      }));

      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

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
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full"
              />
              <div> {/* Replaced FormField with a div */}
                <Label htmlFor="num-cards-to-generate">Number of Flashcards to Generate (Optional)</Label>
                <Input 
                  id="num-cards-to-generate"
                  type="number" 
                  placeholder="Optimal number if left blank" 
                  min="1"
                  value={numCardsToGenerate || ''}
                  onChange={(e) => setNumCardsToGenerate(parseInt(e.target.value) || undefined)}
                  disabled={!file || isLoadingUser || !currentUser}
                  className="mt-1"
                />
                {optimalMaxCards !== null && (
                  <p className="text-sm text-muted-foreground mt-2">
                    AI suggests up to {optimalMaxCards} high-quality cards from this content.
                  </p>
                )}
              </div>
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
            <Button type="submit">Create Set</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateSet;