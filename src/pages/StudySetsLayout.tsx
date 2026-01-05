import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, PanelLeftClose, Library } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import StudySetDetail from "@/pages/StudySetDetail";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";
import { studySetService, StudySet } from '@/services/studySetService';

const StudySetsLayout: React.FC = () => {
    const { user } = useAuth();
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
        setIsCreating(true);
        createSetMutation.mutate();
    };

    const filteredSets = sets?.filter((s: StudySet) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] w-full bg-background border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className={cn("w-full md:w-[300px] lg:w-[350px] border-r flex flex-col bg-muted/10 transition-all duration-300 ease-in-out",
                setId ? "hidden" : "flex",
                (!setId || isSidebarOpen) ? "md:flex" : "md:hidden"
            )}>
                {/* Header */}
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSidebarOpen(false)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground md:flex hidden"
                                title="Collapse Sidebar"
                            >
                                <PanelLeftClose className="h-4 w-4" />
                            </Button>
                            <h2 className="text-lg font-semibold flex items-center gap-3">
                                <Library className="h-5 w-5 text-primary" />
                                Study Sets
                            </h2>
                        </div>
                        <Button
                            size="icon"
                            onClick={handleCreateSet}
                            disabled={isCreating}
                            className="h-8 w-8"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search sets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Sets List */}
                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredSets.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <p className="text-sm">
                                {searchQuery ? "No sets found" : "No study sets yet"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="link"
                                    onClick={handleCreateSet}
                                    className="mt-2"
                                >
                                    Create your first set
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredSets.map((set: StudySet) => (
                                <button
                                    key={set.id}
                                    onClick={() => navigate(`/sets/${set.id}`)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent/50",
                                        setId === set.id ? "bg-accent" : ""
                                    )}
                                >
                                    <div className="font-medium text-sm truncate">{set.title}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            {set.cards_count || 0} cards
                                        </span>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {formatDistanceToNow(new Date(set.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {setId ? (
                    <ScrollArea className="h-full w-full">
                        <StudySetDetail
                            isSidebarOpen={isSidebarOpen}
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        />
                    </ScrollArea>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <Library size={48} className="mx-auto mb-4 opacity-70 text-primary" />
                            <p className="text-lg font-medium">Select a study set</p>
                            <p className="text-sm mt-1">or create a new one to get started</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudySetsLayout;
