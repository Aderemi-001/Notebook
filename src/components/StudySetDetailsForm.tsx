import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NotebookCard, CardContent } from '@/components/NotebookCard';
import { editSetFormSchema } from '@/hooks/use-edit-set-form';
import * as z from 'zod';

interface StudySetDetailsFormProps {
  form: UseFormReturn<z.infer<typeof editSetFormSchema>>;
}

const StudySetDetailsForm: React.FC<StudySetDetailsFormProps> = ({ form }) => {
  return (
    <NotebookCard>
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
    </NotebookCard>
  );
};

export default StudySetDetailsForm;