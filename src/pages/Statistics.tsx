import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, BarChart2, BookOpen, CheckCircle2, AlertCircle, LibraryBig, Menu, Flame } from 'lucide-react'; // Changed LayoutDashboard to BarChart2, added Flame
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
import { Calendar } from "@/components/ui/calendar"; // Import Calendar
import { format, isSameDay, subDays, addDays } from 'date-fns'; // Import date-fns utilities

interface StudyStatistics {
  total_cards: number;
  total_mastered_cards: number;
  total_due_cards: number;
  total_study_sets: number;
}

interface StudyDay {
  study_date: string; // ISO string for date
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

const fetchStudyDays = async (): Promise<StudyDay[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .rpc('get_study_days', { p_user_id: user.id });

  if (error) {
    console.error("Error fetching study days:", error);
    throw new Error("Failed to fetch study days.");
  }
  return data || [];
};

const calculateStreak = (studyDates: Date[]): { currentStreak: number; longestStreak: number } => {
  if (studyDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates in ascending order
  const sortedDates = [...studyDates].sort((a, b) => a.getTime() - b.getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempCurrentStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // Check if today or yesterday was a study day to start current streak calculation
  const wasStudiedToday = sortedDates.some(d => isSameDay(d, today));
  const wasStudiedYesterday = sortedDates.some(d => isSameDay(d, subDays(today, 1)));

  if (wasStudiedToday) {
    tempCurrentStreak = 1;
  } else if (wasStudiedYesterday) {
    tempCurrentStreak = 1; // Will be incremented if day before yesterday was studied
  } else {
    tempCurrentStreak = 0; // No activity today or yesterday, current streak is 0
  }

  // Calculate longest streak and update current streak if applicable
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    currentDate.setHours(0, 0, 0, 0); // Normalize

    if (i === 0) {
      longestStreak = 1;
      if (isSameDay(currentDate, today) || isSameDay(currentDate, subDays(today, 1))) {
        currentStreak = 1;
      }
    } else {
      const previousDate = sortedDates[i - 1];
      previousDate.setHours(0, 0, 0, 0); // Normalize

      if (isSameDay(currentDate, previousDate)) {
        // Same day, skip
        continue;
      } else if (isSameDay(currentDate, addDays(previousDate, 1))) {
        // Consecutive day
        tempCurrentStreak++;
      } else {
        // Gap in streak
        longestStreak = Math.max(longestStreak, tempCurrentStreak);
        tempCurrentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempCurrentStreak); // Update longest streak after each iteration
  }

  // Final check for current streak based on today/yesterday
  if (wasStudiedToday) {
    currentStreak = 1;
    let dayToCheck = subDays(today, 1);
    while (sortedDates.some(d => isSameDay(d, dayToCheck))) {
      currentStreak++;
      dayToCheck = subDays(dayToCheck, 1);
    }
  } else if (wasStudiedYesterday) {
    currentStreak = 1;
    let dayToCheck = subDays(today, 2);
    while (sortedDates.some(d => isSameDay(d, dayToCheck))) {
      currentStreak++;
      dayToCheck = subDays(dayToCheck, 1);
    }
  } else {
    currentStreak = 0;
  }


  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
};


const Statistics: React.FC = () => { // Renamed component to Statistics
  const navigate = useNavigate(); // Initialize useNavigate
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats, error: errorStats } = useQuery<StudyStatistics, Error>({
    queryKey: ['studyStatistics'],
    queryFn: fetchStudyStatistics,
  });

  const { data: studyDaysData, isLoading: isLoadingStudyDays, isError: isErrorStudyDays, error: errorStudyDays } = useQuery<StudyDay[], Error>({
    queryKey: ['studyDays'],
    queryFn: fetchStudyDays,
  });

  const studyDates = studyDaysData?.map(d => new Date(d.study_date)) || [];
  const { currentStreak, longestStreak } = calculateStreak(studyDates);

  const modifiers = {
    studiedDays: studyDates,
  };

  const modifiersClassNames = {
    studiedDays: "bg-primary text-primary-foreground rounded-full",
  };

  const handleDayClick = (day: Date) => {
    const hasStudiedOnDay = studyDates.some(d => isSameDay(d, day));
    if (!hasStudiedOnDay) {
      navigate('/daily-review');
    }
  };

  if (isErrorStats) {
    showError(errorStats?.message || "Failed to load statistics data.");
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading statistics: {errorStats?.message || "Unknown error"}
      </div>
    );
  }

  if (isErrorStudyDays) {
    showError(errorStudyDays?.message || "Failed to load study days data.");
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study days: {errorStudyDays?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <BarChart2 className="mr-3 h-7 w-7" /> Statistics
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

      {isLoadingStats ? (
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

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <NotebookCard>
          <CardHeader>
            <CardTitle>Study Streak</CardTitle>
            <CardDescription>Your current and longest study streaks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStudyDays ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ) : (
              <>
                <div className="flex items-center text-2xl font-bold">
                  <Flame className="mr-2 h-6 w-6 text-orange-500" />
                  <span>Current Streak: {currentStreak} days</span>
                </div>
                <div className="flex items-center text-lg font-medium text-muted-foreground">
                  <Flame className="mr-2 h-5 w-5 text-orange-400" />
                  <span>Longest Streak: {longestStreak} days</span>
                </div>
              </>
            )}
          </CardContent>
        </NotebookCard>

        <NotebookCard>
          <CardHeader>
            <CardTitle>Study Calendar</CardTitle>
            <CardDescription>Days you've studied at least one flashcard. Click on an unstudied day to start reviewing!</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoadingStudyDays ? (
              <Skeleton className="h-[300px] w-full max-w-sm rounded-md" />
            ) : (
              <Calendar
                mode="multiple"
                selected={studyDates}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border"
                onDayClick={handleDayClick} // Add onDayClick handler
              />
            )}
          </CardContent>
        </NotebookCard>
      </div>

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

export default Statistics;