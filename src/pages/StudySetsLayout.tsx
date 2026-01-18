import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Library, Folder } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safeFormatDistanceToNow } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import StudySetDetail from "@/pages/StudySetDetail";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";
import { studySetService, StudySet } from '@/services/studySetService';

import { useSubscription } from "@/hooks/useSubscription";



const StudySetsLayout: React.FC = () => {
    const { user } = useAuth();
    const { isPremium } = useSubscription();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { setId } = useParams<{ setId?: string }>();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Fetch Study Sets List using Service
    const { data: sets, isLoading } = useQuery({
        queryKey: ['studySets', user?.id],
        queryFn: studySetService.getMyStudySets,
        enabled: !!user,
    });

    // Create Study Set Mutation
    const createSetMutation = useMutation({
        mutationFn: async () => {
            return await studySetService.createStudySet("Untitled Set", "", false);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['studySets'] });
            navigate(`/sets/${data.id}`);
            setIsCreating(false);
            showSuccess("New study set created");
        },
        onError: () => {
            showError("Failed to create study set");
            setIsCreating(false);
        }
    });

    const handleCreateSet = () => {
        if (!isPremium && sets && sets.length >= 5) {
            showError("Free Plan Limit Reached: You can only create 5 Study Sets. Upgrade to Pro for unlimited sets.");
            return;
        }
        setIsCreating(true);
        createSetMutation.mutate();
    };

    const filteredSets = sets?.filter((s: StudySet) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    return (
        <div className="min-h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] w-full md:overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar Explorer */}
            <div className={cn("w-full md:w-[320px] lg:w-[380px] border-r border-border/40 flex flex-col bg-muted/5 backdrop-blur-md transition-all duration-300 ease-in-out",
                setId ? "hidden" : "flex",
                (!setId || isSidebarOpen) ? "md:flex" : "md:hidden"
            )}>
                {/* Explorer Header */}
                <div className="p-6 border-b border-border/40 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {!isSidebarOpen && setId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl"
                                >
                                    <Library className="h-5 w-5" />
                                </Button>
                            )}
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <span className="bg-primary/10 p-2 rounded-xl">
                                    <Library className="h-5 w-5 text-primary" />
                                </span>
                                Explorer
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigate('/groups')}
                                className="h-10 w-10 rounded-xl hover:bg-secondary"
                                title="Manage Groups"
                            >
                                <Folder className="h-5 w-5" />
                            </Button>
                            <Button
                                size="icon"
                                onClick={handleCreateSet}
                                disabled={isCreating}
                                className="h-10 w-10 rounded-xl shadow-premium hover:shadow-premium-hover transition-all active:scale-95 bg-primary"
                            >
                                {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Premium Search */}
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            placeholder="Find a set..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-4 py-6 rounded-2xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Sets List with Custom Scrollbar */}
                <ScrollArea className="flex-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Indexing Library...</span>
                        </div>
                    ) : filteredSets.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center">
                            <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                                <Search className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-bold mb-1">
                                {searchQuery ? "No matches found" : "Library is quiet"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 font-medium">
                                {searchQuery ? "Try a different search term" : "Your knowledge pool is empty"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    onClick={handleCreateSet}
                                    className="rounded-xl px-6 font-bold"
                                >
                                    Create First Set
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {filteredSets.map((set: StudySet) => (
                                <button
                                    key={set.id}
                                    onClick={() => navigate(`/sets/${set.id}`)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                        setId === set.id
                                            ? "bg-primary text-primary-foreground shadow-premium font-bold"
                                            : "hover:bg-secondary/80 text-foreground hover:translate-x-1"
                                    )}
                                >
                                    {setId === set.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white/40 rounded-r-full" />
                                    )}
                                    <div className="font-bold text-sm line-clamp-2 break-words leading-tight relative z-10">{set.title}</div>
                                    <div className="flex items-center gap-3 mt-2 relative z-10">
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider font-black",
                                            setId === set.id ? "bg-white/20" : "bg-primary/10 text-primary"
                                        )}>
                                            {set.cards_count || 0} Cards
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-medium opacity-60",
                                            setId === set.id ? "text-white" : "text-muted-foreground"
                                        )}>
                                            {safeFormatDistanceToNow(set.created_at)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Admin/User Context Footer could go here */}
            </div>

            {/* Main Stage Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-transparent pointer-events-none" />

                {setId ? (
                    <ScrollArea className="h-full w-full relative z-10">
                        <StudySetDetail
                            isSidebarOpen={isSidebarOpen}
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        />
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12 relative z-10">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/30 transition-colors duration-700" />
                            <div className="h-32 w-32 rounded-[2.5rem] bg-indigo-950 flex items-center justify-center mb-8 relative z-20 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                <Library size={48} className="text-white drop-shadow-glow" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight mb-2">Select a Study Set</h3>
                        <p className="text-muted-foreground max-w-[280px] font-medium leading-relaxed">
                            Dive into your knowledge library or create a new set to begin your journey.
                        </p>

                        <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-sm">
                            <Button variant="outline" className="rounded-2xl py-8 font-bold border-border/40 hover:bg-secondary" onClick={() => navigate('/explore-public-sets')}>
                                Explore Public
                            </Button>
                            <Button className="rounded-2xl py-8 font-bold shadow-premium hover:shadow-premium-hover" onClick={handleCreateSet}>
                                Create New
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudySetsLayout;
