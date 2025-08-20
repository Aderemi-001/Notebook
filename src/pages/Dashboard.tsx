import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, LayoutDashboard, BookOpen, CheckCircle2, AlertCircle, LibraryBig, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudyStatistics {
  total_cards: number;
  total_mastered_cards: number;
  total_due_cards: number;
  total_study_sets: number;
}

const fetchStudyStatistics = async (): Promise<StudyStatistics> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .rpc('get_user_study_statistics', { p_user_id: user.id })
    .single();

  if (error) {
    console.error("Error fetching study statistics:", error);
    throw new Error("Failed to fetch study statistics.");
  }
  return data as StudyStatistics;
};

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, isError, error } = useQuery<StudyStatistics, Error>({
    queryKey: ['studyStatistics'],
    queryFn: fetchStudyStatistics,
  });

  if (isError) {
    showError(error?.message || "Failed to load dashboard data.");
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading dashboard: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <LayoutDashboard className="mr-3 h-7 w-7" /> Dashboard
        </h1>
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
        A quick overview of your learning progress and activity.
      </p>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NotebookCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Study Sets</CardTitle>
              <LibraryBig className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_study_sets ?? 0}</div>
              <p className="text-xs text-muted-foreground">Sets created by you</p>
            </CardContent>
          </NotebookCard>

          <NotebookCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_cards ?? 0}</div>
              <p className="text-xs text-muted-foreground">Across all your sets</p>
            </CardContent>
          </NotebookCard>

          <NotebookCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mastered Cards</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_mastered_cards ?? 0}</div>
              <p className="text-xs text-muted-foreground">Cards you've mastered</p>
            </CardContent>
          </NotebookCard>

          <NotebookCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cards Due</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_due_cards ?? 0}</div>
              <p className="text-xs text-muted-foreground">Ready for review</p>
            </CardContent>
          </NotebookCard>
        </div>
      )}

      {/* Placeholder for future charts/graphs */}
      <NotebookCard className="mt-6">
        <CardHeader>
          <CardTitle>Study Activity (Coming Soon!)</CardTitle>
          <CardDescription>Visualizations of your daily and weekly study habits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
            Charts and graphs will appear here.
          </div>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Dashboard;