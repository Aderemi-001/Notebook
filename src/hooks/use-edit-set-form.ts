import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import React from "react";

export const editSetFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cards: z.array(z.object({
    id: z.string().optional(), // Card ID is optional for new cards
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

type EditSetFormValues = z.infer<typeof editSetFormSchema>;

interface UseEditSetFormProps {
  setId: string;
  initialData: {
    title: string;
    description: string | null;
    cards: { id: string; term: string; definition: string }[];
    source_text: string | null;
  };
  currentUser: any;
}

export const useEditSetForm = ({ setId, initialData, currentUser }: UseEditSetFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sourceTextContent, setSourceTextContent] = React.useState<string | null>(initialData.source_text);

  const form = useForm<EditSetFormValues>({
    resolver: zodResolver(editSetFormSchema),
    defaultValues: {
      title: initialData.title,
      description: initialData.description || "",
      cards: initialData.cards.map(card => ({
        id: card.id,
        term: card.term,
        definition: card.definition,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  const onSubmit = async (values: EditSetFormValues) => {
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
          source_text: sourceTextContent, // Update the source text here
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
      navigate(`/sets/${setId}`);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to update set.");
      console.error(error);
    }
  };

  const onError = (errors: any) => {
    console.error(errors);
    showError("Please fix the errors before submitting.");
  };

  return {
    form,
    fields,
    append,
    remove,
    onSubmit,
    onError,
    sourceTextContent,
    setSourceTextContent,
  };
};