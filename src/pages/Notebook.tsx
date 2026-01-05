import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, PenTool, Loader2, NotebookPen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import UnifiedEditor from "@/components/notebook/UnifiedEditor";
import { useAuth } from "@/hooks/useAuth";
import { showSuccess, showError } from "@/utils/toast";

// Types
export interface NoteSummary {
    id: string;
    title: string;
    updated_at: string;
    content: any; // minimal content for preview
}

const Notebook: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Fetch Notes List
    const { data: notes, isLoading } = useQuery({
        queryKey: ['notebook-list', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('notes')
                .select('id, title, updated_at, content')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data as NoteSummary[];
        },
        enabled: !!user,
    });

    // Create Note Mutation
    const createNoteMutation = useMutation({
        mutationFn: async (type: 'text' | 'canvas') => {
            const newNote = {
                user_id: user?.id,
                title: "Untitled Note",
                content: type === 'canvas'
                    ? { type: 'canvas', version: 1, image: null, background: 'lined' }
                    : { type: 'doc', content: [{ type: 'paragraph' }] }
            };
            const { data, error } = await supabase.from('notes').insert(newNote).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['notebook-list'] });
            setSelectedNoteId(data.id);
            setIsCreating(false);
            showSuccess("New note created");
        },
        onError: () => {
            showError("Failed to create note");
            setIsCreating(false);
        }
    });

    const handleCreateNote = () => {
        setIsCreating(true);
        // Default to text, user can switch inside
        createNoteMutation.mutate('text');
    };

    const filteredNotes = notes?.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())) || [];

    return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] w-full bg-background border rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
            {/* Mobile View: Show list only if no note selected */}
            <div className={cn("w-full md:w-[300px] lg:w-[350px] border-r flex flex-col bg-muted/10 transition-all duration-300 ease-in-out",
                selectedNoteId ? "hidden" : "flex",
                (!selectedNoteId || isSidebarOpen) ? "md:flex" : "md:hidden"
            )}>
                {/* Header */}
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <NotebookPen className="h-5 w-5 text-primary" />
                            <h2 className="font-semibold text-lg">My Notes</h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCreateNote}
                            disabled={isCreating}
                            className="text-primary hover:bg-primary/10"
                        >
                            {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-8 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-1 p-2">
                        {isLoading && <div className="p-4 text-center text-muted-foreground">Loading...</div>}
                        {!isLoading && filteredNotes.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No notes found.
                            </div>
                        )}
                        {filteredNotes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => setSelectedNoteId(note.id)}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-colors hover:bg-accent",
                                    selectedNoteId === note.id ? "bg-accent/80 ring-1 ring-border" : "bg-transparent"
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={cn("font-medium truncate", !note.title && "text-muted-foreground italic")}>
                                        {note.title || "Untitled Note"}
                                    </span>
                                    {note.content?.type === 'canvas' || note.content?.activeMode === 'canvas' ? (
                                        <PenTool className="h-3 w-3 text-muted-foreground/70" />
                                    ) : (
                                        <FileText className="h-3 w-3 text-muted-foreground/70" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 w-full text-xs text-muted-foreground">
                                    <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                                    <span className="truncate max-w-[120px]">
                                        {note.content?.type === 'canvas' || note.content?.activeMode === 'canvas' ? "Handwritten" : "Text Note"}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Editor Area */}
            <div className={cn("flex-1 h-full bg-background flex flex-col", !selectedNoteId ? "hidden md:flex" : "flex")}>
                {selectedNoteId ? (
                    <UnifiedEditor
                        key={selectedNoteId} // Force remount on switch
                        noteId={selectedNoteId}
                        onBack={() => setSelectedNoteId(null)} // Mobile back
                        onDelete={() => {
                            setSelectedNoteId(null);
                            queryClient.invalidateQueries({ queryKey: ['notebook-list'] });
                        }}
                        onUpdate={() => {
                            queryClient.invalidateQueries({ queryKey: ['notebook-list'] });
                        }}
                        isSidebarOpen={isSidebarOpen}
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in-50">
                        <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Select a note to view</h3>
                        <p className="max-w-xs mt-2">
                            Choose a note from the list on the left, or create a new one to get started.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notebook;
