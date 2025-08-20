import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { NotebookCard, CardHeader, CardContent } from "@/components/NotebookCard";

// Import new modular components and hooks
import { useEditSetForm } from "@/hooks/use-edit-set-form";
import StudySetDetailsForm from "@/components/StudySetDetailsForm";
import StudySetImportSection from "@/components/StudySetImportSection";
import FlashcardsEditor from "@/components/FlashcardsEditor";

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  cards: { id: string; term: string; definition: string }[];
  source_text: string | null;
}

const fetchStudySetForEdit = async (setId: string): Promise<StudySetData> => {
  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      source_text,
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set for edit:", error);
    throw new Error("Failed to fetch study set for editing.");
  }
  if (!data) {
    throw new Error("Study set not found.");
  }
  return data as StudySetData;
};

const EditSet = () => {
  const { setId } = useParams<{ setId: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  const { data: studySet, isLoading, isError, error } = useQuery<StudySetData, Error>({
    queryKey: ['editStudySet', setId],
    queryFn: () => fetchStudySetForEdit(setId!),
    enabled: !!setId,
  });

  const { form, fields, append, remove, onSubmit, onError, setSourceTextContent } = useEditSetForm({
    setId: setId!,
    initialData: studySet || { title: "", description: null, cards: [], source_text: null },
    currentUser: currentUser,
  });

  // Reset form when studySet data changes (e.g., after initial load)
  React.useEffect(() => {
    if (studySet) {
      form.reset({
        title: studySet.title,
        description: studySet.description || "",
        cards: studySet.cards.map(card => ({
          id: card.id,
          term: card.term,
          definition: card.definition,
        })),
      });
      setSourceTextContent(studySet.source_text);
    }
  }, [studySet, form, setSourceTextContent]);


  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No study set ID provided for editing.
      </div>
    );
  }

  if (isLoading || isLoadingUser) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study set for editing: {error?.message || "Unknown error"}
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
        <h1 className="text-3xl font-bold">Edit Study Set</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <React.Fragment>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set
            </React.Fragment>
          </Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <StudySetDetailsForm form={form} />
          <StudySetImportSection
            currentUser={currentUser}
            isLoadingUser={isLoadingUser}
            appendCards={append}
            setSourceTextContent={setSourceTextContent}
          />
          <FlashcardsEditor
            form={form}
            fields={fields}
            append={append}
            remove={remove}
          />
          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditSet;