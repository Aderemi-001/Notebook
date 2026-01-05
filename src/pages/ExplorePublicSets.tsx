import * as React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; // Import Button
import { Globe, BookOpen, User } from 'lucide-react';

interface PublicStudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
  is_public: boolean;
  user_id: string;
  display_name: string | null;
}

const fetchPublicStudySets = async (): Promise<PublicStudySet[]> => {
  const { data, error } = await supabase
    .rpc('get_public_study_sets_with_card_count');

  if (error) {
    console.error("Error fetching public study sets:", error);
    throw error;
  }
  return data || [];
};

const ExplorePublicSets: React.FC = () => {
  const { data: publicSets, isLoading, isError, error } = useQuery<PublicStudySet[], Error>({
    queryKey: ['publicStudySets'],
    queryFn: fetchPublicStudySets,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Globe className="h-7 w-7" /> Explore Public Study Sets
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <div className="p-6 pt-0 flex justify-between items-center">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading public study sets: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <Globe className="h-7 w-7" /> Explore Public Study Sets
      </h1>

      {publicSets && publicSets.length === 0 ? (
        <p className="text-muted-foreground text-center text-lg">
          No public study sets available yet. Be the first to create one!
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {publicSets?.map((set) => (
            <Card key={set.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">
                  <Link to={`/sets/${set.id}`} className="hover:underline">
                    {set.title}
                  </Link>
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3" /> {set.display_name || 'Anonymous'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {set.description || "No description provided."}
                </p>
              </CardContent>
              <div className="p-6 pt-0 flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-4 w-4" /> {set.cards_count} cards
                </span>
                <Link to={`/sets/${set.id}`}>
                  <Button variant="outline" size="sm">View Set</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePublicSets;