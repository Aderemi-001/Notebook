import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards: CardItem[];
}

interface CardItem {
  id: string;
  term: string;
  definition: string;
}

const fetchStudySetDetails = async (setId: string): Promise<StudySet> => {
  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set details:", error);
    throw new Error("Failed to fetch study set details.");
  }
  if (!data) {
    throw new Error("Study set not found.");
  }
  return data as StudySet;
};

const StudySetDetail = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: studySet, isLoading, isError, error } = useQuery<StudySet, Error>({
    queryKey: ['studySet', setId],
    queryFn: () => fetchStudySetDetails(setId!),
    enabled: !!setId, // Only run query if setId is available
  });

  const handleDeleteSet = async () => {
    if (!setId) return;

    const toastId = showLoading("Deleting study set...");
    try {
      const { error } = await supabase
        .from('study_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Study set deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] }); // Invalidate the list of study sets
      navigate('/'); // Redirect to home page after deletion
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to delete study set.");
      console.error("Delete error:", error);
    }
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No study set ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study set: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto py-10 text-center">
        Study set not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{studySet.title}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
            </Link>
          </Button>
          {studySet.cards.length > 0 && (
            <Button asChild>
              <Link to={`/sets/${setId}/study`}>
                <PlayCircle className="mr-2 h-4 w-4" /> Start Study
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link to={`/sets/${setId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Set
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Set
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  "{studySet.title}" study set and all its associated cards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSet}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {studySet.description && (
        <p className="text-muted-foreground mb-6">{studySet.description}</p>
      )}

      <h2 className="text-2xl font-semibold mb-4">Cards ({studySet.cards.length})</h2>
      {studySet.cards.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No cards in this set yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySet.cards.map((card) => (
            <Card key={card.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{card.term}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{card.definition}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudySetDetail;