import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CardContent, CardHeader, CardTitle, CardDescription, NotebookCard } from '@/components/NotebookCard'; // Import CardDescription from NotebookCard
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudySetGroup } from '@/hooks/use-study-set-groups'; // Import StudySetGroup interface

interface StudySetFormFieldsProps {
  form: UseFormReturn<any>; // Use any for now, or define a more specific schema type
  userGroups: StudySetGroup[] | undefined;
  isLoadingGroups: boolean;
  isErrorGroups: boolean;
  errorGroups: Error | null;
}

const StudySetFormFields: React.FC<StudySetFormFieldsProps> = ({ form, userGroups, isLoadingGroups, isErrorGroups, errorGroups }) => {
  return (
    <NotebookCard>
      <CardHeader>
        <CardTitle>Set Details</CardTitle>
        <CardDescription>Give your study set a title, description, and configure its visibility.</CardDescription>
      </CardHeader>
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
        <div className="mt-4">
          <FormField
            control={form.control}
            name="group_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group (Optional)</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "null" ? null : value)} value={field.value || "null"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">No Group</SelectItem>
                    {isLoadingGroups ? (
                      <SelectItem disabled value="loading">Loading groups...</SelectItem>
                    ) : userGroups?.length === 0 ? (
                      <SelectItem disabled value="no-groups">No groups available</SelectItem>
                    ) : (
                      userGroups?.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Organize this study set into a group.
                </FormDescription>
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