
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
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

const fetchEssayQuestions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('essay_questions')
    .select('*, study_sets(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const EssayIndex: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: questions, isLoading } = useQuery({
    queryKey: ['essayQuestions'],
    queryFn: fetchEssayQuestions
  });

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('essay_questions')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" /> Essay Practice
        </h1>
        <Button asChild><Link to="/generate-essay-questions"><PlusCircle className="mr-2 h-4 w-4" /> New Question</Link></Button>
      </div>

      {isLoading ? (
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
                  {new Date(q.created_at).toLocaleDateString()}
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