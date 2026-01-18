import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, FileText, PenTool, MoreHorizontal, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import DigitalCanvas from '@/components/DigitalCanvas';
import { showSuccess, showError } from '@/utils/toast';
import { Editor } from '@tiptap/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StudySetSelector } from "./StudySetSelector";

interface UnifiedEditorProps {
    noteId: string;
    onBack: () => void;
    onDelete: () => void;
    onUpdate: () => void;
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
}

const UnifiedEditor: React.FC<UnifiedEditorProps> = ({ noteId, onBack, onDelete, onUpdate, isSidebarOpen, onToggleSidebar }) => {
    const queryClient = useQueryClient();
    const editorRef = useRef<Editor | null>(null);
    const isMobile = useIsMobile();

    // Fetch Note Details
    const { data: note, isLoading } = useQuery({
        queryKey: ['note-detail', noteId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', noteId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!noteId
    });

    const [title, setTitle] = useState("");

    // Split State for Lossless Switching
    const [textContent, setTextContent] = useState<any>(null);
    const [canvasContent, setCanvasContent] = useState<any>(null);
    const [mode, setMode] = useState<'text' | 'canvas'>('text');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userHasToggledMode, setUserHasToggledMode] = useState(false); // Track user interaction
    const [isImmersive, setIsImmersive] = useState(false);

    // Auto-enter immersive mode on mobile when switching to canvas
    useEffect(() => {
        if (isMobile && mode === 'canvas') {
            setIsImmersive(true);
        } else {
            setIsImmersive(false);
        }
    }, [mode, isMobile]);

    // Refs for Stale Closure Protection (Crucial for unmount saves)
    const modeRef = useRef(mode);
    const textContentRef = useRef(textContent);
    const canvasContentRef = useRef(canvasContent);

    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { textContentRef.current = textContent; }, [textContent]);
    useEffect(() => { canvasContentRef.current = canvasContent; }, [canvasContent]);

    const lastInitializedNoteId = useRef<string | null>(null);

    // Initialize state when note loads - only purely on fresh note load
    useEffect(() => {
        if (note && note.id !== lastInitializedNoteId.current) {
            setTitle(note.title);

            const c = (note.content as any) || {};

            let initialMode: 'text' | 'canvas' = 'text';

            // Check for New Unified Format
            if (c.textContent || c.canvasContent) {
                setTextContent(c.textContent || { type: 'doc', content: [{ type: 'paragraph' }] });
                setCanvasContent(c.canvasContent || { type: 'canvas', version: 1, image: null });
                initialMode = c.activeMode || 'text';
            }
            // Legacy / Single Type Handling
            else if (c.type === 'canvas') {
                setCanvasContent(c);
                setTextContent({ type: 'doc', content: [{ type: 'paragraph' }] });
                initialMode = 'canvas';
            } else {
                // Default to Text (legacy doc or empty)
                setTextContent(c.type === 'doc' ? c : { type: 'doc', content: [{ type: 'paragraph' }] });
                setCanvasContent({ type: 'canvas', version: 1, image: null });
                initialMode = 'text';
            }

            // Only set mode if user hasn't manually toggled it (or if it's a fresh load)
            if (!userHasToggledMode) {
                setMode(initialMode);
            }

            lastInitializedNoteId.current = note.id;
        }
    }, [note]);

    // Construct the Unified Payload
    const getPayload = (t: any, c: any, m: any) => ({
        textContent: t,
        // Ensure we strictly pass the object structure we want
        canvasContent: {
            ...c,
            // If we have strokes, prioritize them (new format)
            // If using older format, they might still be in c.image, but DigitalCanvas now expects JSON string of strokes
            // We should ensure that whatever DigitalCanvas gives us (which is a JSON string) is stored securely
        },
        activeMode: m,
        type: 'unified',
        version: 2
    });

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (updatedNote: any) => {
            const { error } = await supabase
                .from('notes')
                .update({ ...updatedNote, updated_at: new Date().toISOString() })
                .eq('id', noteId);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsSaving(false);
            queryClient.invalidateQueries({ queryKey: ['note-detail', noteId] });
            onUpdate();
        },
        onError: () => {
            setIsSaving(false);
            showError("Failed to save changes");
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;
        },
        onSuccess: () => {
            showSuccess("Note deleted");
            onDelete();
        }
    });

    // Debounced Save for Title
    useEffect(() => {
        if (!note || title === note.title) return;
        const timer = setTimeout(() => {
            setIsSaving(true);
            saveMutation.mutate({ title });
        }, 1000);
        return () => clearTimeout(timer);
    }, [title]);


    // Handlers
    const generateTitleFromContent = (jsonContent: any): string | null => {
        if (!jsonContent || !jsonContent.content) return null;
        try {
            // Simple recursive text extraction from TipTap JSON
            const extractText = (node: any): string => {
                if (node.text) return node.text;
                if (node.content && Array.isArray(node.content)) {
                    return node.content.map(extractText).join(' ');
                }
                return '';
            };

            const fullText = extractText(jsonContent).trim();
            if (!fullText) return null;

            // Get first ~40 chars, break at last space to avoid cutting words
            let candidate = fullText.slice(0, 40);
            if (fullText.length > 40) {
                const lastSpace = candidate.lastIndexOf(' ');
                if (lastSpace > 0) candidate = candidate.substring(0, lastSpace);
                candidate += '...';
            }
            return candidate;
        } catch (e) {
            return null;
        }
    };

    const handleSaveText = (newText: any) => {
        // Optimistic update
        setTextContent(newText);

        // Auto-Rename Logic for "Untitled Note"
        // We check against the default or common untitled variations
        if (title === "Untitled Note" || title.startsWith("Untitled Note")) {
            const smartTitle = generateTitleFromContent(newText);
            if (smartTitle && smartTitle !== title) {
                console.log("Auto-renaming to:", smartTitle);
                setTitle(smartTitle); // This will trigger the title save useEffect
            }
        }

        // Save using Refs to ensure we don't accidentally revert canvas or mode if they changed in parallel
        setIsSaving(true);
        saveMutation.mutate({ content: getPayload(newText, canvasContentRef.current, modeRef.current) });
    };



    const toggleMode = () => {
        const newMode = mode === 'text' ? 'canvas' : 'text';
        setMode(newMode);
        setUserHasToggledMode(true); // Mark that user has manually toggled
        // We don't need to explicitly save here.
        // 1. If we are leaving Canvas, DigitalCanvas.unmount -> handleSaveCanvas -> Save with new modeRef.
        // 2. If we are leaving Text, DebounceSaver.unmount -> handleSaveText -> Save with new modeRef.
    };

    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    return (
        <div className={cn("flex flex-col h-full transition-all duration-300", isImmersive && "fixed inset-0 z-[9999] bg-background h-[100dvh] w-screen touch-none overscroll-none")}>

            {/* Header */}
            <div className={cn(
                "flex items-center p-4 border-b border-border/40 bg-background/60 backdrop-blur-md z-50 h-16 shrink-0 transition-all duration-300",
                isImmersive && "h-0 p-0 overflow-hidden opacity-0"
            )}>
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            className="hidden md:flex text-muted-foreground hover:text-foreground mr-1 shrink-0"
                            title={isSidebarOpen ? "Close Sidebar" : "Expand View"}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                        </Button>
                    )}

                    <input
                        className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full min-w-0 bg-transparent truncate"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Note Title"
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground mr-2 hidden sm:inline-block whitespace-nowrap">
                        {isSaving ? "Saving..." : "Saved"}
                    </span>

                    <StudySetSelector
                        selectedSetId={note?.study_set_id ?? null}
                        onSelectSet={(setId) => {
                            // Optimistic update handled by query invalidation or state if needed
                            // But usually best to just mutate
                            saveMutation.mutate({ study_set_id: setId });
                        }}
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shadow-sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={toggleMode}>
                                {mode === 'text' ? <><PenTool className="mr-2 h-4 w-4" /> Switch to Handwriting</> : <><FileText className="mr-2 h-4 w-4" /> Switch to Text</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setIsDeleteDialogOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Premium Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card rounded-[2rem] border-red-500/20 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter text-red-500">
                            Purge Knowledge Node?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-medium leading-relaxed pt-2">
                            This action will permanently delete "{title}" from your neural library. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                        <AlertDialogCancel className="rounded-xl px-6 font-bold border-border/60">
                            Keep Note
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="rounded-xl px-8 font-black bg-red-600 hover:bg-red-700 shadow-premium active:scale-95 transition-all"
                        >
                            Confirm Destruction
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Editor Body */}
            <div className="flex-1 overflow-hidden relative">
                {mode === 'text' ? (
                    <div className="h-full overflow-y-auto p-4 md:p-8 w-full max-w-none">
                        <RichTextEditor
                            editorRef={editorRef}
                            content={textContent}
                            onContentChange={(newVal) => {
                                setTextContent(newVal);
                            }}
                        />
                        {/* Adapter: DebounceSaver sends { content: ... }, we strip it and call handleSaveText */}
                        <DebounceSaver
                            content={textContent}
                            onSave={(wrapped) => handleSaveText(wrapped.content)}
                        />
                    </div>
                ) : (
                    <div className="h-full w-full bg-transparent overflow-hidden">
                        <DigitalCanvas
                            // Use .strokes if valid, otherwise fallback to .image if it looks like JSON?
                            // DigitalCanvas now parses JSON string.
                            // If c.image was the old DataURL, DigitalCanvas will ignore it (safe).
                            // If c.strokes is our new JSON string, pass it.
                            initialData={canvasContent?.strokes || canvasContent?.image}
                            onSave={(data) => {
                                // data is the JSON string of strokes
                                // Update local state
                                const newCanvas = {
                                    ...canvasContentRef.current,
                                    type: 'canvas',
                                    version: 2, // Bump version
                                    strokes: data, // Store raw JSON string here
                                    image: null // Clear legacy image to avoid confusion
                                };
                                setCanvasContent(newCanvas);

                                // Trigger Save
                                setIsSaving(true);
                                saveMutation.mutate({
                                    content: getPayload(textContentRef.current, newCanvas, modeRef.current)
                                });
                            }}
                            className="shadow-md bg-white rounded-lg"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper to debounce content saves with "Save on Unmount" protection
const DebounceSaver = ({ content, onSave }: { content: any, onSave: (c: any) => void }) => {
    const latestContent = useRef(content);
    const saveRef = useRef(onSave);
    const hasChanges = useRef(false);

    // Update refs
    useEffect(() => {
        latestContent.current = content;
        saveRef.current = onSave;
        hasChanges.current = true;
    }, [content, onSave]);

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hasChanges.current) {
                // Determine if we should save (e.g. ignore default/empty if needed, but safety first)
                if (latestContent.current && latestContent.current.type !== 'canvas') {
                    saveRef.current({ content: latestContent.current });
                    hasChanges.current = false;
                }
            }
        }, 1000); // Auto-save after 1 second of inactivity

        return () => clearTimeout(timer);
    }, [content]);

    // Unmount / component destruction safeguard
    useEffect(() => {
        return () => {
            if (hasChanges.current && latestContent.current && latestContent.current.type !== 'canvas') {
                console.log("Saving on unmount...");
                saveRef.current({ content: latestContent.current });
            }
        };
    }, []);

    return null;
};

export default UnifiedEditor;
