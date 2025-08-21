import React from 'react';
import { Link } from 'react-router-dom';
import { CardContent, CardHeader, CardTitle, CardDescription, NotebookCard } from "@/components/NotebookCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface LinkedNote {
  id: string;
  title: string;
  updated_at: string;
}

interface StudySetLinkedNotesProps {
  linkedNotes: LinkedNote[] | undefined;
  isLoadingLinkedNotes: boolean;
}

const StudySetLinkedNotes: React.FC<StudySetLinkedNotesProps> = ({ linkedNotes, isLoadingLinkedNotes }) => {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4 mt-8">Linked Notes ({linkedNotes?.length || 0})</h2>
      {isLoadingLinkedNotes ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
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
      ) : (linkedNotes?.length === 0 || !linkedNotes) ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No notes linked to this study set yet.</p>
          <Button asChild className="mt-4">
            <Link to="/create-note" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> Create New Note
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {linkedNotes.map((note) => (
            <Link to={`/notes/${note.id}/edit`} key={note.id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Last updated: {format(new Date(note.updated_at), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>View Note</span>
                  </div>
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default StudySetLinkedNotes;