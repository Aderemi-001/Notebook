import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cards: z.array(z.object({
    id: z.string().optional(), // Card ID is optional for new cards
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  cards: { id: string; term: string; definition: string }[];
}

const fetchStudySetForEdit = async (setId: string): Promise<StudySetData> => {
  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set for edit:", error);
    throw new Error("Failed to fetch study set for editing.");
  }
  if (!data) {
    throw new Error("Study set not found.");
  }
  return data as StudySetData;
};

const EditSet = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      cards: [{ term: "", definition: "" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  const { data: studySet, isLoading, isError, error } = useQuery<StudySetData, Error>({
    queryKey: ['editStudySet', setId],
    queryFn: () => fetchStudySetForEdit(setId!),
    enabled: !!setId,
  });

  useEffect(() => {
    if (studySet) {
      form.reset({
        title: studySet.title,
        description: studySet.description || "",
        cards: studySet.cards.map(card => ({
          id: card.id,
          term: card.term,
          definition: card.definition,
        })),
      });
    }
  }, [studySet, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!setId) {
      showError("Study set ID is missing.");
      return;
    }

    const toastId = showLoading("Updating your study set...");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to edit a set.");
      }

      // Update study_sets table
      const { error: updateSetError } = await supabase
        .from('study_sets')
        .update({
          title: values.title,
          description: values.description,
        })
        .eq('id', setId);

      if (updateSetError) throw updateSetError;

      // Separate existing cards from new cards
      const existingCards = values.cards.filter(card => card.id);
      const newCards = values.cards.filter(card => !card.id);

      // Get current card IDs from the database to identify deleted ones
      const { data: currentDbCards, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', setId);

      if (fetchCardsError) throw fetchCardsError;

      const currentDbCardIds = new Set(currentDbCards.map(card => card.id));
      const formCardIds = new Set(existingCards.map(card => card.id));

      // Identify cards to delete
      const cardsToDelete = Array.from(currentDbCardIds).filter(dbId => !formCardIds.has(dbId));

      if (cardsToDelete.length > 0) {
        const { error: deleteCardsError } = await supabase
          .from('cards')
          .delete()
          .in('id', cardsToDelete);
        if (deleteCardsError) throw deleteCardsError;
      }

      // Update existing cards
      for (const card of existingCards) {
        const { error: updateCardError } = await supabase
          .from('cards')
          .update({ term: card.term, definition: card.definition })
          .eq('id', card.id);
        if (updateCardError) throw updateCardError;
      }

      // Insert new cards
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
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] }); // Invalidate detail view
      queryClient.invalidateQueries({ queryKey: ['studySets'] }); // Invalidate list view
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

  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No study set ID provided for editing.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study set for editing: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto py-10 text-center">
        Study set not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Study Set</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set
          </Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Biology Chapter 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief description of your study set." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flashcards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md">
                  <div className="font-bold text-gray-500 mt-2">{index + 1}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                    <FormField
                      control={form.control}
                      name={`cards.${index}.term`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Term</FormLabel>
                          <FormControl>
                            <Input placeholder="Term" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`cards.${index}.definition`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Definition</FormLabel>
                          <FormControl>
                            <Input placeholder="Definition" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="mt-7"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.cards && !form.formState.errors.cards.root && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.cards.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ term: "", definition: "" })}
              >
                Add Card
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditSet;