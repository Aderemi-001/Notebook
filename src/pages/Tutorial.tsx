import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { NotebookCard, CardHeader, CardTitle, CardContent } from '@/components/NotebookCard';
import TutorialSteps from '@/components/TutorialSteps';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const Tutorial: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleCompleteTutorial = async () => {
    const toastId = showLoading("Marking tutorial as complete...");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated.");
      }

      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_tutorial: true })
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Tutorial completed! Welcome aboard.");
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }); // Invalidate profile to reflect change
      navigate('/'); // Redirect to home page
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to mark tutorial as complete.");
      console.error("Complete tutorial error:", err);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">App Tutorial</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Skip for now
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6 text-center">
        Use the arrows to navigate through the tutorial steps.
      </p>

      <TutorialSteps onCompleteTutorial={handleCompleteTutorial} />
    </div>
  );
};

export default Tutorial;