import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import React from "react";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cards: z.array(z.object({
    term: z.string().min(1, "Term is required"),
    definition: z.string().min(1, "Definition is required"),
  })).min(1, "You must have at least one card."),
});

const CreateSet = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      cards: [{ term: "", definition: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const toastId = showLoading("Saving your study set...");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to create a set.");
      }

      // Insert into study_sets table
      const { data: set, error: setError } = await supabase
        .from('study_sets')
        .insert({
          title: values.title,
          description: values.description,
          user_id: user.id,
        })
        .select()
        .single();

      if (setError) throw setError;

      // Prepare cards for insertion
      const cardsToInsert = values.cards.map(card => ({
        set_id: set.id,
        term: card.term,
        definition: card.definition,
      }));

      // Insert into cards table
      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      dismissToast(toastId);
      showSuccess("Set created successfully!");
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

  const handleFileImport = async () => {
    if (!file) {
      showError("Please select a file first.");
      return;
    }

    const toastId = showLoading("AI is processing your file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke('process-file', {
        body: formData,
      });

      dismissToast(toastId);

      if (error || data.error) {
        throw new Error(data?.error || error.message);
      }
      
      const newCards = data.cards;

      if (!newCards || newCards.length === 0) {
        showError("The AI couldn't find any terms and definitions in the file.");
        return;
      }

      form.setValue('cards', newCards, { shouldValidate: true });
      showSuccess(`${newCards.length} cards imported successfully!`);

    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "An unexpected error occurred.");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create a new study set</h1>
        <Button asChild variant="outline">
          <Link to="/">Cancel</Link>
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
              <CardTitle>Import from file with AI</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Input 
                type="file" 
                accept=".txt,.csv,.md,.pdf" 
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full sm:w-auto flex-grow"
              />
              <Button type="button" onClick={handleFileImport} disabled={!file} className="w-full sm:w-auto">
                Import with AI
              </Button>
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
            <Button type="submit">Create Set</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateSet;