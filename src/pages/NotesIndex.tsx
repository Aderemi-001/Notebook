import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, PlusCircle, Search, FileText, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  content: any; // JSON content, we'll just check for existence
}

const fetchUserNotes = async (): Promise<NoteSummary[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, created_at, updated_at, content')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching user notes:", error);
    throw new Error("Failed to fetch your notes.");
  }

  return data || [];
};

const NotesIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: notes, isLoading, isError, error } = useQuery<NoteSummary[], Error>({
    queryKey: ['userNotes'],
    queryFn: fetchUserNotes,
  });

  const filteredNotes = notes?.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.content && JSON.stringify(note.content).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading notes: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Notes</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Sets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notes/new" className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Note
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Organize your thoughts, ideas, and study material here.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search notes by title or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      ) : (filteredNotes?.length === 0 || !filteredNotes) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No notes found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Click 'Create New Note' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <Link to={`/notes/${note.id}`} key={note.id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                  <CardDescription className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    Last updated: {format(new Date(note.updated_at), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Optionally show a snippet of the content here */}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content ? JSON.stringify(note.content).substring(0, 150) + '...' : 'No content'}
                  </p>
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesIndex;