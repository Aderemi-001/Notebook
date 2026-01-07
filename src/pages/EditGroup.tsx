import * as React from 'react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const formSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

type EditGroupFormValues = z.infer<typeof formSchema>;

interface StudySetGroup {
  id: string;
  name: string;
  description: string | null;
}

const fetchGroupDetails = async (groupId: string): Promise<StudySetGroup> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_set_groups')
    .select('id, name, description')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching group details:", error);
    throw new Error("Failed to fetch group details.");
  }
  if (!data) {
    throw new Error("Group not found.");
  }
  return data as StudySetGroup;
};

const EditGroup: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<EditGroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { data: group, isLoading, isError, error } = useQuery<StudySetGroup, Error>({
    queryKey: ['studySetGroup', groupId],
    queryFn: () => fetchGroupDetails(groupId!),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description || '',
      });
    }
  }, [group, form]);

  const onSubmit = async (values: EditGroupFormValues) => {
    if (!groupId) {
      showError("Group ID is missing.");
      return;
    }

    const toastId = showLoading("Updating group...");
    try {
      const { error } = await supabase
        .from('study_set_groups')
        .update({
          name: values.name,
          description: values.description,
        })
        .eq('id', groupId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Group updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySetGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['studySetGroups'] });
      navigate('/groups');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to update group.");
      console.error("Update group error:", err);
    }
  };

  if (!groupId) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        No group ID provided for editing.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Card className="glass-card shadow-premium rounded-[2rem] border-white/20">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-24 self-end" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading group: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center animate-fade-in">
        Group not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Group: {group.name}</h1>
        <Button asChild variant="outline">
          <Link to="/groups" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Groups
          </Link>
        </Button>
      </div>

      <Card className="glass-card shadow-premium rounded-[2rem] border-white/20 mb-6">
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Update the name and description of your study set group.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Semester 1 Courses" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of this group." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditGroup;