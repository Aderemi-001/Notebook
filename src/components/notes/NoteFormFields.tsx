import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStudySets, UserStudySet } from '@/hooks/use-user-study-sets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface NoteFormFieldsProps {
  form: UseFormReturn<any>;
}

const NoteFormFields: React.FC<NoteFormFieldsProps> = ({ form }) => {
  const { data: userStudySets, isLoading: isLoadingStudySets } = useUserStudySets();

  return (
    <Card className="glass-card shadow-premium rounded-[2rem] border-white/20 mb-6">
      <CardHeader>
        <CardTitle>Note Details</CardTitle>
        <CardDescription>Enter the title and content for your new note.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Note Title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="study_set_id"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Link to Study Set (Optional)</FormLabel>
              <Select onValueChange={(value: string) => field.onChange(value === "null" ? null : value)} value={field.value || "null"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a study set" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">No Study Set</SelectItem>
                  {isLoadingStudySets ? (
                    <SelectItem disabled value="loading">Loading study sets...</SelectItem>
                  ) : userStudySets?.length === 0 ? (
                    <SelectItem disabled value="no-sets">No study sets available</SelectItem>
                  ) : (
                    userStudySets?.map((set: UserStudySet) => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default NoteFormFields;