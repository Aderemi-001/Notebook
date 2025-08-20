import React from 'react';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NotebookCard, CardHeader, CardTitle, CardContent } from '@/components/NotebookCard';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import * as z from 'zod';
import { editSetFormSchema } from '@/hooks/use-edit-set-form';

interface FlashcardsEditorProps {
  form: UseFormReturn<z.infer<typeof editSetFormSchema>>;
  fields: UseFieldArrayReturn<z.infer<typeof editSetFormSchema>, "cards", "id">["fields"];
  append: UseFieldArrayReturn<z.infer<typeof editSetFormSchema>, "cards", "id">["append"];
  remove: UseFieldArrayReturn<z.infer<typeof editSetFormSchema>, "cards", "id">["remove"];
}

const FlashcardsEditor: React.FC<FlashcardsEditorProps> = ({ form, fields, append, remove }) => {
  return (
    <NotebookCard>
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
    </NotebookCard>
  );
};

export default FlashcardsEditor;