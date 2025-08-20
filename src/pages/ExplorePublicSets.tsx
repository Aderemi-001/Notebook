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

interface PublicStudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
  user_id: string;
  is_public: boolean;
  display_name: string | null;
}

const fetchPublicStudySets = async (): Promise<PublicStudySet[]> => {
  const { data, error } = await supabase
    .rpc('get_public_study_sets_with_card_count');

  if (error) {
    console.error("Error fetching public study sets:", error);
    throw new Error("Failed to fetch public study sets.");
  }
  return data || [];
};

const ExplorePublicSets: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: publicStudySets, isLoading, isError, error } = useQuery<PublicStudySet[], Error>({
    queryKey: ['publicStudySets'],
    queryFn: fetchPublicStudySets,
  });

  const filteredPublicSets = publicStudySets?.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (set.display_name && set.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading public study sets: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Explore Public Sets</h1>
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
        Discover and add public study sets created by other users.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search public sets by title, description, or creator..."
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
      ) : (filteredPublicSets?.length === 0 || !filteredPublicSets) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No public study sets found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "There are no public sets available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPublicSets.map((set) => (
            <Link to={`/sets/${set.id}`} key={set.id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">{set.title}</CardTitle>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Public
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
                      <User className="mr-2 h-4 w-4" />
                      <span>Created by: {set.display_name}</span>
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

export default ExplorePublicSets;