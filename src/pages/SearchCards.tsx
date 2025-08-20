import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Search, BookOpen, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchResultCard {
  card_id: string;
  term: string;
  definition: string;
  set_id: string;
  set_title: string;
}

const fetchSearchResults = async (searchTerm: string): Promise<SearchResultCard[]> => {
  if (!searchTerm.trim()) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .rpc('search_user_cards', { search_query: searchTerm });

  if (error) {
    console.error("Error searching cards:", error);
    throw new Error("Failed to search cards.");
  }
  return data || [];
};

const SearchCards: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce the search term to avoid excessive API calls
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const { data: searchResults, isLoading, isError, error } = useQuery<SearchResultCard[], Error>({
    queryKey: ['searchCards', debouncedSearchTerm],
    queryFn: () => fetchSearchResults(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm.trim(), // Only run query if debouncedSearchTerm is not empty
  });

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error searching cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Search My Cards</h1>
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
        Search for specific terms or definitions across all your study sets.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search terms or definitions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading && debouncedSearchTerm.trim() ? (
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
      ) : (searchResults?.length === 0 && debouncedSearchTerm.trim()) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No cards found!</h2>
          <p className="text-muted-foreground mt-2">
            Try a different search term.
          </p>
        </div>
      ) : (searchResults && searchResults.length > 0) ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {searchResults.map((card) => (
            <Link to={`/sets/${card.set_id}`} key={card.card_id}>
              <NotebookCard className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{card.term}</CardTitle>
                  <CardDescription>{card.definition}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>From Set: {card.set_title}</span>
                  </div>
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">Start searching your cards!</h2>
          <p className="text-muted-foreground mt-2">
            Type a term or definition into the search bar above.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchCards;