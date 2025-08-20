import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
}

const Index = () => {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudySets = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // We use an RPC call to a custom function to count cards efficiently
        const { data, error } = await supabase
          .rpc('get_study_sets_with_card_count');

        if (error) {
          console.error("Error fetching study sets:", error);
        } else {
          setStudySets(data || []);
        }
      }
      setLoading(false);
    };

    fetchStudySets();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Study Sets</h1>
        <Button asChild>
          <Link to="/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Set
          </Link>
        </Button>
      </div>

      {loading ? (
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
      ) : studySets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets yet!</h2>
          <p className="text-muted-foreground mt-2">
            Click "Create Set" to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySets.map((set) => (
            <Card key={set.id} className="hover:shadow-md transition-shadow">
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;