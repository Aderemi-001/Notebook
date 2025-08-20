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
import { ArrowLeft, Save, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const formSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100, "Space name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

type CreateSpaceFormValues = z.infer<typeof formSchema>;

const CreateCollaborationSpace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const form = useForm<CreateSpaceFormValues>({
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

  const onSubmit = async (values: CreateSpaceFormValues) => {
    if (!currentUser) {
      showError("You must be logged in to create a collaboration space.");
      return;
    }

    const toastId = showLoading("Creating collaboration space...");
    try {
      const { data, error } = await supabase
        .from('collaboration_spaces')
        .insert({
          created_by_user_id: currentUser.id,
          name: values.name,
          description: values.description,
        })
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Collaboration space "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpaces'] });
      navigate('/collaboration');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to create collaboration space.");
      console.error("Create space error:", err);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Collaboration Space</h1>
        <Button asChild variant="outline">
          <Link to="/collaboration" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader className="pl-10">
          <CardTitle>Space Details</CardTitle>
          <CardDescription>Give your new collaboration space a name and an optional description.</CardDescription>
        </CardHeader>
        <CardContent className="pl-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Space Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Study Group for Biology 101" {...field} />
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
                      <Textarea placeholder="A brief description of this collaboration space." {...field} />
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
                      <Users className="mr-2 h-4 w-4" /> Create Space
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

export default CreateCollaborationSpace;