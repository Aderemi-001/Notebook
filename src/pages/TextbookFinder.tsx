import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Search, Loader2, BookOpen, ExternalLink, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast'; // Removed showLoading, dismissToast
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';

interface TextbookResult {
  title: string;
  author: string;
  description: string;
  access_method: string;
  link: string;
  cost_implication: string;
}

const fetchTextbooks = async (query: string): Promise<TextbookResult[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated. Please log in to use the textbook finder.");
  }

  const response = await fetch(
    `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/textbook-finder`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ query }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result?.error || "Failed to find textbooks.");
  }

  return result.results || [];
};

const TextbookFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const { user, loading: isLoadingAuth } = useAuth();

  const { data: results, isLoading, isError, error } = useQuery<TextbookResult[], Error>({
    queryKey: ['textbookSearch', submittedQuery],
    queryFn: () => fetchTextbooks(submittedQuery),
    enabled: !!submittedQuery && !!user && !isLoadingAuth,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showError("Please enter a search query.");
      return;
    }
    if (!user) {
      showError("You must be logged in to use the textbook finder.");
      return;
    }
    setSubmittedQuery(searchQuery);
  };

  if (isLoadingAuth) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (isError && submittedQuery) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error searching for textbooks: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <BookOpen className="mr-3 h-7 w-7" /> Textbook Finder
        </h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Find legitimate and ethical access options for textbooks, including library resources, open educational materials, and official purchase links.
      </p>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Search for Textbooks</CardTitle>
          <CardDescription>Enter the title, author, or ISBN of the textbook you're looking for.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Label htmlFor="textbook-search" className="sr-only">Search query</Label>
            <Input
              id="textbook-search"
              type="text"
              placeholder="e.g., 'Calculus by Stewart', 'Biology OpenStax', '978-0321743250'"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="flex-grow"
              disabled={!user}
            />
            <Button type="submit" disabled={!searchQuery.trim() || isLoading || !user}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="sr-only">Search</span>
            </Button>
          </form>
          {!user && <p className="text-sm text-red-500 mt-2">Please log in to use the textbook finder.</p>}
        </CardContent>
      </NotebookCard>

      {isLoading && submittedQuery && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      )}

      {results && results.length > 0 && (
        <NotebookCard className="mt-6">
          <CardHeader>
            <CardTitle>Search Results for "{submittedQuery}"</CardTitle>
            <CardDescription>Found {results.length} legitimate access options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.map((result: TextbookResult, index: number) => (
              <div key={index} className="border p-4 rounded-md bg-background">
                <h3 className="text-xl font-semibold mb-1">{result.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">by {result.author}</p>
                <p className="text-muted-foreground text-sm mb-3">{result.description}</p>
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Access Method: {result.access_method}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Cost: {result.cost_implication}</span>
                </div>
                {result.link && (
                  <Button asChild variant="outline" size="sm">
                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="mr-2 h-4 w-4" /> View Resource
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </NotebookCard>
      )}

      {results && results.length === 0 && submittedQuery && !isLoading && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-6">
          <h2 className="text-xl font-semibold">No legitimate textbooks found for "{submittedQuery}"</h2>
          <p className="text-muted-foreground mt-2">
            Try a different search query or explore other study resources.
          </p>
        </div>
      )}

      <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
        <p className="font-semibold mb-2">Important Note on Access:</p>
        <p>
          This tool helps you find legitimate ways to access textbooks. Downloading copyrighted material from unofficial sources may violate copyright laws. We encourage you to use legal alternatives such as library access, open educational resources, or purchasing/renting from authorized retailers to support authors and publishers.
        </p>
      </div>
    </div>
  );
};

export default TextbookFinder;