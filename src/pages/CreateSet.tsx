import { useForm, useFieldArray } from "react-hook-form";
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
import { useFileImport } from "@/hooks/use-file-import"; // Import the hook

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

  const { file, setFile, sourceTextContent, setSourceTextContent, handleFileImport, currentUser, isLoadingUser } = useFileImport(); // Use the hook
  const { data: userGroups, isLoading: isLoadingGroups } = useStudySetGroups();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_public: false,
      group_id: (location.state as { groupId?: string })?.groupId || null,
      cards: [{ term: "", definition: "" }],
    },
  });

  const { append } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  // No need for local getUser effect, useFileImport handles currentUser

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
    const result = await handleFileImport(); // Call the hook's function
    if (result && result.cards.length > 0) {
      // Clear existing default card if it's empty, then append
      if (form.getValues('cards').length === 1 && !form.getValues('cards')[0].term && !form.getValues('cards')[0].definition) {
        form.setValue('cards', []);
      }
      result.cards.forEach(card => {
        append({ term: card.term, definition: card.definition });
      });
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
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Input 
                type="file" 
                accept=".txt,.csv,.md,.json,.xml,.html,.js,.ts,.css,.pdf" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full sm:w-auto flex-grow"
              />
              <Button 
                type="button" 
                onClick={handleImportAndAppendCards} 
                disabled={!file || isLoadingUser || !currentUser} 
                className="w-full sm:w-auto"
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