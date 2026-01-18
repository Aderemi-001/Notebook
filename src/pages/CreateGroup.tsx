import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    console.log("onSubmit called with values:", values);

    if (!currentUser) {
      console.error("No current user found");
      const msg = "You must be logged in to create a group.";
      showError(msg);
      form.setError('root', { message: msg }); // Show in UI
      return;
    }

    const toastId = showLoading("Creating group...");
    try {
      console.log("Checking for existing groups...");
      // Check if group name already exists for this user
      const { data: existingGroups, error: checkError } = await supabase
        .from('study_set_groups')
        .select('name')
        .eq('user_id', currentUser.id)
        .ilike('name', values.name);

      if (checkError) {
        console.error("Check error:", checkError);
        throw checkError;
      }

      if (existingGroups && existingGroups.length > 0) {
        console.warn("Group already exists");
        dismissToast(toastId);
        const msg = `A group named "${values.name}" already exists. Please choose a different name.`;
        showError(msg);
        form.setError('root', { message: msg });
        return;
      }

      console.log("Inserting new group...");
      const { data, error } = await supabase
        .from('study_set_groups')
        .insert({
          user_id: currentUser.id,
          name: values.name,
          description: values.description,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error details:", error);
        // Handle unique constraint violation from database
        if (error.code === '23505') { // PostgreSQL unique violation code
          throw new Error(`A group named "${values.name}" already exists. Please choose a different name.`);
        }
        throw error;
      }

      console.log("Group created successfully:", data);
      dismissToast(toastId);
      showSuccess(`Group "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['studySetGroups'] });
      navigate('/groups');
    } catch (err: any) {
      dismissToast(toastId);
      const errorMessage = err.message || "Failed to create group.";
      showError(errorMessage);
      console.error("Create group catch block:", err);
      // Set visible form error for the user
      form.setError('root', { message: errorMessage });
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Group</h1>
        <Button asChild variant="outline">
          <Link to="/groups" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Groups
          </Link>
        </Button>
      </div>

      <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20 mb-6">
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Give your new study set group a name and an optional description.</CardDescription>
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
              <div className="flex flex-col items-end gap-3 mt-6">
                {/* Explicit type=button to prevent default submit, handle manually to debug */}
                <Button
                  type="button"
                  size="lg"
                  disabled={isLoadingUser || form.formState.isSubmitting}
                  onClick={async (e) => {
                    e.preventDefault();
                    console.log("Create Group button clicked");
                    // Manual trigger to debug validation
                    const isValid = await form.trigger();
                    console.log("Form validity:", isValid, form.formState.errors);

                    if (isValid) {
                      form.handleSubmit(onSubmit)(e);
                    } else {
                      // Force error display if validation fails
                      const errors = form.formState.errors;
                      const errorMsg = Object.values(errors).map((e: any) => e.message).join(", ");
                      form.setError('root', { message: `Validation failed: ${errorMsg}` });
                    }
                  }}
                  className="w-full sm:w-auto font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Group...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Group
                    </>
                  )}
                </Button>

                {form.formState.errors.root && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    Error: {form.formState.errors.root.message}
                  </div>
                )}

                <div id="debug-error-area" className="text-red-500 text-sm mt-2 text-right empty:hidden"></div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div >
  );
};

export default CreateGroup;