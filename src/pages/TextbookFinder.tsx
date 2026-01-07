
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Search, Loader2, BookOpen, ExternalLink, Calendar, FileText, Globe, Book, FileDown, ChevronDown, Library } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { Label } from "@/components/ui/label";
import { textbookService, TextbookResult } from '@/services/textbookService';

const TextbookFinder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filterFree, setFilterFree] = useState(false);

  const { data: results, isLoading, isError, error } = useQuery<TextbookResult[], Error>({
    queryKey: ['textbookSearch', submittedQuery, filterFree],
    queryFn: () => textbookService.searchBooks(submittedQuery, filterFree),
    enabled: !!submittedQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showError("Please enter a search query.");
      return;
    }
    setSubmittedQuery(searchQuery);
  };

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Search className="h-8 w-8 text-purple-500" /> Textbook Finder
        </h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Search for textbooks and study resources using the Google Books library.
      </p>

      <Card className="glass-card shadow-premium rounded-[2.5rem] mb-6 border-white/20">
        <CardHeader>
          <CardTitle>Search for Textbooks</CardTitle>
          <CardDescription>Enter the title, author, or ISBN.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Label htmlFor="textbook-search" className="sr-only">Search query</Label>
              <Input
                id="textbook-search"
                type="text"
                placeholder="e.g., 'Calculus', 'Campbell Biology'"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" disabled={!searchQuery.trim() || isLoading} className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-all">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="sr-only">Search</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-filter"
                checked={filterFree}
                onCheckedChange={(checked) => setFilterFree(checked as boolean)}
              />
              <Label
                htmlFor="free-filter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show only free e-books (Google Books)
              </Label>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && submittedQuery && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="glass-card shadow-premium rounded-[2rem]">
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
            </Card>
          ))}
        </div>
      )}

      {isError && submittedQuery && (
        <div className="text-center text-red-500 py-8">
          Error searching for textbooks: {error?.message}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {results.map((result: TextbookResult, index: number) => {
            // Smart Title Cleaning: Remove subtitles (after :), extra meta (after | or -), and "Books:" prefix
            const cleanTitle = result.title.split(/[:|(-]/)[0].replace(/^Books:\s?/i, '').trim();

            return (
              <Card key={index} className="glass-card shadow-premium rounded-[2rem] flex flex-col h-full hover:shadow-lg transition-shadow border-white/10 dark:border-white/5">
                <CardHeader className="pb-2">
                  <div className="flex gap-4">
                    {result.thumbnail && (
                      <img
                        src={result.thumbnail}
                        alt={`Cover of ${result.title}`}
                        className="w-16 h-24 object-cover rounded shadow-sm border"
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg line-clamp-2">{result.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">by {result.author}</p>
                      {result.isbn && <p className="text-xs text-muted-foreground mt-1">ISBN: {result.isbn}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {result.publishedDate}
                    </span>
                    {result.pageCount && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {result.pageCount} pages
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button asChild variant="default" size="sm" className="flex-1">
                    <a
                      href={result.previewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Google Books
                    </a>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-3">
                        Free Sources <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://annas-archive.org/search?q=${encodeURIComponent(result.isbn || cleanTitle)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer font-medium"
                        >
                          <Library className="mr-2 h-4 w-4" /> Anna's Archive (Z-Lib)
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://libgen.is/search.php?req=${encodeURIComponent(cleanTitle)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <BookOpen className="mr-2 h-4 w-4" /> Library Genesis
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://archive.org/search.php?query=${encodeURIComponent(result.isbn || cleanTitle)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <Globe className="mr-2 h-4 w-4" /> Archive.org {result.isbn ? '(ISBN)' : ''}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(cleanTitle)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <Book className="mr-2 h-4 w-4" /> Project Gutenberg
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(cleanTitle + ' filetype:pdf')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <FileDown className="mr-2 h-4 w-4" /> Web Search (PDF)
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {results && results.length === 0 && submittedQuery && !isLoading && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-6">
          <h2 className="text-xl font-semibold">No textbooks found for "{submittedQuery}"</h2>
          <p className="text-muted-foreground mt-2">
            Try a different search query.
          </p>
        </div>
      )}
    </div>
  );
};

export default TextbookFinder;