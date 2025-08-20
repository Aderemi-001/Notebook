import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CardContent } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';

interface StudySetFormFieldsProps {
  form: UseFormReturn<any>; // Use any for now, or define a more specific schema type
}

const StudySetFormFields: React.FC<StudySetFormFieldsProps> = ({ form }) => {
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
        <div className="mt-4 flex items-center space-x-2">
          <FormField
            control={form.control}
            name="is_public"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Make Public</FormLabel>
                  <FormDescription>
                    Allow other users to view and study this set.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </NotebookCard>
  );
};

export default StudySetFormFields;