import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { studySetService, StudySet } from '@/services/studySetService';
import DashboardStats from '@/components/dashboard/DashboardStats';
import SmartStudySuggestions from '@/components/dashboard/SmartStudySuggestions';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, Plus, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard: React.FC = () => {
    const { user, profile, loading: isLoadingAuth } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: studySets, isLoading } = useQuery<StudySet[], Error>({
        queryKey: ['studySets', user?.id],
        queryFn: studySetService.getMyStudySets,
        enabled: !!user && !isLoadingAuth,
    });

    const filteredStudySets = studySets?.filter(set =>
        set.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoadingAuth) {
        return (
            <div className="container mx-auto py-6 sm:py-8 md:py-10 space-y-6">
                <Skeleton className="h-12 w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 sm:py-8 md:py-10 space-y-6 animate-fade-in">
            {/* Welcome Banner */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <LayoutDashboard className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                        {(user && studySets && studySets.length > 0) ? 'Welcome back,' : 'Welcome to Notebook,'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                            {profile?.display_name || user?.email?.split('@')[0] || 'Scholar'}
                        </span>!
                    </h1>
                </div>
                <p className="text-muted-foreground text-lg">
                    Ready to continue your learning journey?
                </p>
            </div>

            {/* Dashboard Stats */}
            <DashboardStats />

            {/* Smart Suggestions */}
            <SmartStudySuggestions />

            {/* Quick Actions */}
            <QuickActions />

            {/* Recent Activity & Study Sets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-1">
                    <RecentActivity />
                </div>

                {/* Study Sets Section */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5" />
                                    My Study Sets
                                </CardTitle>
                                <Button size="sm" onClick={() => navigate('/create')}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    New Set
                                </Button>
                            </div>
                            {/* Search */}
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search your sets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                                </div>
                            ) : filteredStudySets && filteredStudySets.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredStudySets.slice(0, 5).map((set) => (
                                        <button
                                            key={set.id}
                                            onClick={() => navigate(`/sets/${set.id}`)}
                                            className="w-full p-4 rounded-lg border hover:bg-accent transition-colors text-left group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold truncate">{set.title}</h3>
                                                    {set.description && (
                                                        <p className="text-sm text-muted-foreground truncate mt-1">
                                                            {set.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="ml-4 text-sm text-muted-foreground shrink-0">
                                                    {set.cards_count || 0} cards
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredStudySets.length > 5 && (
                                        <Button
                                            variant="ghost"
                                            className="w-full mt-2"
                                            onClick={() => navigate('/sets')}
                                        >
                                            View all {filteredStudySets.length} sets →
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-sm">
                                        {searchQuery ? 'No sets found' : 'No study sets yet'}
                                    </p>
                                    {!searchQuery && (
                                        <Button
                                            variant="link"
                                            onClick={() => navigate('/create')}
                                            className="mt-2"
                                        >
                                            Create your first set
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
