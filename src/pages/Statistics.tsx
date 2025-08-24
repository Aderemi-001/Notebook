import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { CalendarDays, LayoutDashboard, ArrowLeft, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from "@/components/ui/separator";
import { isSameDay, subDays } from 'date-fns'; // Removed format

interface StudyStatistics {
  total_cards: number;
  total_mastered_cards: number;
  total_due_cards: number;
  total_study_sets: number;
}

interface StudyDay {
  study_date: string;
}

const fetchStudyStatistics = async (userId: string): Promise<StudyStatistics> => {
  const { data, error } = await supabase.rpc('get_user_study_statistics', { p_user_id: userId });
  if (error) {
    console.error("Error fetching study statistics:", error);
    throw error;
  }
  return data[0];
};

const fetchStudyDays = async (userId: string): Promise<StudyDay[]> => {
  const { data, error } = await supabase.rpc('get_study_days', { p_user_id: userId });
  if (error) {
    console.error("Error fetching study days:", error);
    throw error;
  }
  return data;
};

const Statistics: React.FC = () => {
  const { user, loading: isLoadingAuth } = useAuth();
  // Removed viewMode and setViewMode as they are no longer used for toggling display
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: statistics, isLoading: isLoadingStats, isError: isErrorStats, error: statsError } = useQuery<StudyStatistics, Error>({
    queryKey: ['studyStatistics', user?.id],
    queryFn: () => fetchStudyStatistics(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  const { data: studyDays, isLoading: isLoadingStudyDays, isError: isErrorStudyDays, error: studyDaysError } = useQuery<StudyDay[], Error>({
    queryKey: ['studyDays', user?.id],
    queryFn: () => fetchStudyDays(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  useEffect(() => {
    if (studyDays && studyDays.length > 0 && !selectedDate) {
      // Set the latest study day as default if available
      const latestDay = studyDays.reduce((latest, current) => {
        const latestDate = new Date(latest.study_date);
        const currentDate = new Date(current.study_date);
        return currentDate > latestDate ? current : latest;
      });
      setSelectedDate(new Date(latestDay.study_date));
    }
  }, [studyDays, selectedDate]);

  const getStreak = (days: StudyDay[] | undefined) => {
    if (!days || days.length === 0) return 0;

    const sortedDates = days
      .map(d => new Date(d.study_date))
      .sort((a, b) => b.getTime() - a.getTime()); // Descending

    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

    for (let i = 0; i < sortedDates.length; i++) {
      const studyDate = sortedDates[i];
      studyDate.setHours(0, 0, 0, 0);

      if (isSameDay(studyDate, currentDate)) {
        currentStreak++;
      } else if (isSameDay(studyDate, subDays(currentDate, 1))) {
        currentStreak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break; // Gap in streak
      }
    }
    return currentStreak;
  };

  const streak = getStreak(studyDays);

  if (isLoadingAuth) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Please log in to view your study statistics.</p>
          <Button asChild className="mt-4">
            <Link to="/login">Log In / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isErrorStats || isErrorStudyDays) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading statistics: {statsError?.message || studyDaysError?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <LayoutDashboard className="mr-3 h-7 w-7" /> Study Statistics
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
            </Link>
          </Button>
          {/* Removed DropdownMenu for consistency */}
        </div>
      </div>

      {/* Always render 'All Time Statistics' as the view mode toggle was removed */}
      <>
        <p className="text-muted-foreground mb-6">
          An overview of your entire study journey.
        </p>
        {(isLoadingStats || isLoadingStudyDays) ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Study Sets
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total_study_sets ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Sets created or added by you
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cards
                </CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total_cards ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Cards across all your sets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mastered Cards</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total_mastered_cards ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Cards you've successfully learned
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{streak} days</div>
                <p className="text-xs text-muted-foreground">
                  Consecutive days of study
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </>

      <Separator className="my-8" />

      <div className="mt-8 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded-md text-sm text-blue-800 dark:text-blue-200">
        <p className="font-semibold mb-2">Understanding Your Statistics:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">Total Study Sets:</span> The number of flashcard sets you have created or added to your collection.</li>
          <li><span className="font-medium">Total Cards:</span> The cumulative count of all flashcards across all your study sets.</li>
          <li><span className="font-medium">Mastered Cards:</span> Cards that you have successfully reviewed multiple times and are considered "mastered" by the spaced repetition algorithm.</li>
          <li><span className="font-medium">Current Streak:</span> The number of consecutive days you have engaged in study activity. Keep it going!</li>
        </ul>
      </div>
    </div>
  );
};

export default Statistics;