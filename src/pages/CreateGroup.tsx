import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const formSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

type CreateGroupFormValues = z.infer<typeof formSchema>;

const CreateGroup: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  const onSubmit = async (values: CreateGroupFormValues) => {
    if (!currentUser) {
      showError("You must be logged in to create a group.");
      return;
    }

    const toastId = showLoading("Creating group...");
    try {
      const { data, error } = await supabase
        .from('study_set_groups')
        .insert({
          user_id: currentUser.id,
          name: values.name,
          description: values.description,
        })
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Group "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['studySetGroups'] });
      navigate('/groups');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to create group.");
      console.error("Create group error:", err);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Group</h1>
        <Button asChild variant="outline">
          <Link to="/groups" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader> {/* Removed pl-10 */}
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Give your new study set group a name and an optional description.</CardDescription>
        </CardHeader>
        <CardContent> {/* Removed pl-10 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
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
                render={({ field }) => (
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
                <Button type="submit" disabled={isLoadingUser || form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Group
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default CreateGroup;