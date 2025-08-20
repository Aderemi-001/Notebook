import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, BookOpen, User } from "lucide-react"; // Import User icon
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react"; // Import React for React.Fragment

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
}

const fetchStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // If no user, return empty array or throw an error depending on desired behavior
    // For now, returning empty array as AuthLayout should handle redirection
    return [];
  }

  // We use an RPC call to a custom function to count cards efficiently
  const { data, error } = await supabase
    .rpc('get_study_sets_with_card_count');

  if (error) {
    console.error("Error fetching study sets:", error);
    throw new Error("Failed to fetch study sets.");
  }
  return data || [];
};

const Index = () => {
  const queryClient = useQueryClient();
  const { data: studySets, isLoading, isError, error } = useQuery<StudySet[], Error>({
    queryKey: ['studySets'],
    queryFn: fetchStudySets,
  });

  // Invalidate query when component mounts to ensure fresh data after navigation
  // This is a simple way to ensure data is fresh when returning to the page
  // More sophisticated invalidation can be done from CreateSet page after successful creation
  queryClient.invalidateQueries({ queryKey: ['studySets'] });

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
        <h1 className="text-3xl font-bold">My Study Sets</h1>
        <div className="flex gap-2"> {/* Group buttons */}
          <Button asChild>
            <Link to="/create" className="flex items-center">
              <React.Fragment>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Set
              </React.Fragment>
            </Link>
          </Button>
          <Button asChild variant="outline"> {/* New Profile button */}
            <Link to="/profile" className="flex items-center">
              <React.Fragment>
                <User className="mr-2 h-4 w-4" /> Profile
              </React.Fragment>
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (studySets?.length === 0 || !studySets) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets yet!</h2>
          <p className="text-muted-foreground mt-2">
            Click "Create Set" to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySets.map((set) => (
            <Link to={`/sets/${set.id}`} key={set.id}> {/* Make the card clickable */}
              <Card className="hover:shadow-md transition-shadow h-full"> {/* Ensure card takes full height */}
                <CardHeader>
                  <CardTitle>{set.title}</CardTitle>
                  {set.description && (
                    <CardDescription>{set.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>{set.cards_count} cards</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;