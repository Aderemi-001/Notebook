import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, BookOpen, Globe, Menu, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VisibleStudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
  user_id: string;
  is_public: boolean;
  display_name: string | null;
  is_owner: boolean;
}

const searchVisibleStudySets = async (searchTerm: string): Promise<VisibleStudySet[]> => {
  // If search term is empty, fetch all visible sets (similar to previous behavior)
  // Otherwise, use the new RPC for searching
  if (!searchTerm.trim()) {
    const { data, error } = await supabase
      .rpc('get_all_visible_study_sets_with_card_count'); // Re-using the existing RPC for no search term

    if (error) {
      console.error("Error fetching all visible study sets:", error);
      throw new Error("Failed to fetch study sets.");
    }
    return data || [];
  } else {
    const { data, error } = await supabase
      .rpc('search_visible_study_sets', { search_query: searchTerm });

    if (error) {
      console.error("Error searching visible study sets:", error);
      throw new Error("Failed to search study sets.");
    }
    return data || [];
  }
};

const SearchSets: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: foundStudySets, isLoading, isError, error } = useQuery<VisibleStudySet[], Error>({
    queryKey: ['searchAllVisibleStudySets', searchTerm],
    queryFn: () => searchVisibleStudySets(searchTerm),
    keepPreviousData: true, // Keep previous data while fetching new results
  });

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study sets: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Search All Study Sets</h1>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Search across all your private sets and public sets shared by others, including card content.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by title, description, creator, or card content..."
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
      ) : (foundStudySets?.length === 0 || !foundStudySets) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Start by creating your own sets or exploring public ones."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {foundStudySets.map((set) => (
            <Link to={`/sets/${set.id}`} key={set.id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">{set.title}</CardTitle>
                  <Badge variant={set.is_public ? "default" : "secondary"} className="flex items-center gap-1">
                    {set.is_public ? <Globe className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {set.is_public ? "Public" : "Private"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {set.description && (
                    <CardDescription>{set.description}</CardDescription>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>{set.cards_count} cards</span>
                  </div>
                  {set.display_name && (
                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                      <span className="mr-2">Created by:</span>
                      <span className="font-medium">{set.display_name} {set.is_owner && "(You)"}</span>
                    </div>
                  )}
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSets;