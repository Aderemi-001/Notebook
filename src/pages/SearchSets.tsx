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

const fetchAllVisibleStudySets = async (): Promise<VisibleStudySet[]> => {
  const { data, error } = await supabase
    .rpc('get_all_visible_study_sets_with_card_count');

  if (error) {
    console.error("Error fetching all visible study sets:", error);
    throw new Error("Failed to fetch study sets.");
  }

  return data || [];
};

const SearchSets: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allVisibleStudySets, isLoading, isError, error } = useQuery<VisibleStudySet[], Error>({
    queryKey: ['allVisibleStudySets'],
    queryFn: fetchAllVisibleStudySets,
  });

  const filteredStudySets = allVisibleStudySets?.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (set.display_name && set.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        Search across all your private sets and public sets shared by others.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by title, description, or creator..."
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
      ) : (filteredStudySets?.length === 0 || !filteredStudySets) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Start by creating your own sets or exploring public ones."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudySets.map((set) => (
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