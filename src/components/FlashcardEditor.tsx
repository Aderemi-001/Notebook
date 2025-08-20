import React from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { Trash2 } from 'lucide-react';

interface FlashcardEditorProps {
  form: UseFormReturn<any>; // Use any for now, or define a more specific schema type
}

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cards",
  });

  return (
    <NotebookCard>
      <CardHeader className="pl-10"> {/* Added pl-10 */}
        <CardTitle>Flashcards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pl-10"> {/* Added pl-10 */}
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
            {form.formState.errors.cards.message as string}
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

export default FlashcardEditor;