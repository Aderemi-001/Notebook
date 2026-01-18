import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, FileText, MoreHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { essayService } from '@/services/essayService';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fetchEssayQuestions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return essayService.getEssayQuestions(user.id);
};


const EssayIndex: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['essayQuestions'],
    queryFn: fetchEssayQuestions
  });

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Separate delete for questions and responses if needed, but for now we only have delete on questions in UI.
  // Actually PastEssays might need delete too? The original PastEssays.tsx didn't have delete. I'll stick to mostly display.

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const success = await essayService.deleteEssayQuestion(deleteId);
      if (!success) return;

      showSuccess("Question deleted");
      queryClient.invalidateQueries({ queryKey: ['essayQuestions'] });
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      showError("Failed to delete: " + err.message);
    }

  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="w-full px-4 md:px-8 py-10 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" /> Essay Practice
        </h1>

        {/* Desktop Actions */}
        <div className="hidden md:flex gap-2">
          <Button asChild><Link to="/generate-essay-questions"><PlusCircle className="mr-2 h-4 w-4" /> New Question</Link></Button>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/generate-essay-questions" className="cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Question
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoadingQuestions ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {questions.map((q: any) => (
            <Card key={q.id} className="glass-card shadow-premium rounded-[2rem] border-white/20 hover:border-primary/30 transition-all duration-300 flex flex-col relative group">
              <CardHeader>
                <CardTitle className="line-clamp-2 text-lg">{q.question_text}</CardTitle>
                <CardDescription>{q.study_sets?.title || 'General'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(q.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button asChild className="flex-1" variant="secondary">
                  <Link to={`/essay-practice/${q.id}`}>Practice Now</Link>
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => confirmDelete(q.id, e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-dashed border-2 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Essay Questions Yet</h2>
          <p className="text-muted-foreground mb-4">Generate questions from your study sets to start practicing.</p>
          <Button asChild><Link to="/generate-essay-questions">Create One</Link></Button>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your essay question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EssayIndex;