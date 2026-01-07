import * as React from "react";
import { Check, ChevronsUpDown, Link as LinkIcon, Plus, X, BookOpen, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studySetService } from "@/services/studySetService";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";

interface StudySetSelectorProps {
    selectedSetId: string | null;
    onSelectSet: (setId: string | null) => void;
}

export const StudySetSelector: React.FC<StudySetSelectorProps> = ({
    selectedSetId,
    onSelectSet,
}) => {
    const [open, setOpen] = React.useState(false);
    const [view, setView] = React.useState<'list' | 'create'>('list');
    const [newSetTitle, setNewSetTitle] = React.useState("");
    const isMobile = useIsMobile();
    const queryClient = useQueryClient();

    const { data: studySets = [] } = useQuery({
        queryKey: ['my-study-sets-list'],
        queryFn: studySetService.getMyStudySets,
    });

    const selectedSet = studySets.find(set => set.id === selectedSetId);

    const createSetMutation = useMutation({
        mutationFn: async (title: string) => {
            return await studySetService.createStudySet(title);
        },
        onSuccess: (newSet) => {
            queryClient.invalidateQueries({ queryKey: ['my-study-sets-list'] });
            onSelectSet(newSet.id);
            setOpen(false);
            setView('list');
            setNewSetTitle("");
            showSuccess("New study set created and linked!");
        },
        onError: () => {
            showError("Failed to create study set.");
        }
    });

    const handleCreate = () => {
        if (!newSetTitle.trim()) return;
        createSetMutation.mutate(newSetTitle);
    };

    const SelectorContent = (
        <div className="flex flex-col h-full bg-background rounded-l-2xl md:rounded-xl overflow-hidden">
            {view === 'list' ? (
                <Command className="bg-transparent">
                    <CommandInput placeholder="Search study sets..." className="h-11 border-b" />
                    <CommandList className="max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                                <p>No exact match found.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setNewSetTitle(""); // Or use search term if accessible
                                        setView('create');
                                    }}
                                    className="mt-2 text-primary border-primary/20 hover:bg-primary/5"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Create New Set
                                </Button>
                            </div>
                        </CommandEmpty>

                        <CommandGroup heading="Actions">
                            <CommandItem
                                value="create-new-set-action"
                                onSelect={() => setView('create')}
                                disabled={false}
                                className="cursor-pointer text-primary font-bold bg-primary/5 mb-2 rounded-lg py-0 px-0 aria-selected:bg-primary/10 data-[disabled]:opacity-100"
                            >
                                <div
                                    className="flex items-center w-full h-full py-3 px-2 pointer-events-auto"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setView('create');
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Set
                                </div>
                            </CommandItem>
                            {selectedSetId && (
                                <CommandItem
                                    value="unlink-current-set"
                                    onSelect={() => {
                                        onSelectSet(null);
                                        setOpen(false);
                                    }}
                                    disabled={false}
                                    className="cursor-pointer text-red-500 font-medium hover:bg-red-500/10 rounded-lg py-0 px-0 aria-selected:bg-red-500/5 data-[disabled]:opacity-100"
                                >
                                    <div
                                        className="flex items-center w-full h-full py-3 px-2 pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectSet(null);
                                            setOpen(false);
                                        }}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Unlink Current Set
                                    </div>
                                </CommandItem>
                            )}
                        </CommandGroup>

                        <CommandSeparator className="my-2" />

                        <CommandGroup heading="Your Library">
                            {studySets.map((set) => (
                                <CommandItem
                                    key={set.id}
                                    value={`${set.title}-${set.id}`}
                                    keywords={[set.title]}
                                    disabled={false}
                                    onSelect={() => {
                                        onSelectSet(set.id === selectedSetId ? null : set.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "cursor-pointer rounded-xl mb-1 transition-all duration-200 py-3 px-3",
                                        "data-[disabled]:opacity-100", // Force opacity
                                        selectedSetId === set.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 bg-transparent"
                                    )}
                                >
                                    <div
                                        className="flex items-start gap-4 w-full pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectSet(set.id === selectedSetId ? null : set.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <div className={cn(
                                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm",
                                            selectedSetId === set.id ? "border-primary/50 bg-primary/20 text-primary" : "border-border bg-background text-foreground"
                                        )}>
                                            {selectedSetId === set.id ? <Check className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className={cn("font-bold text-sm truncate", selectedSetId === set.id ? "text-primary" : "text-foreground")}>
                                                {set.title}
                                            </span>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-medium">
                                                <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-foreground/80">
                                                    {set.cards_count || 0} cards
                                                </span>
                                                <span className="flex items-center gap-1 opacity-70">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(set.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            ) : (
                <div className="p-4 space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="ghost" size="sm" onClick={() => setView('list')} className="-ml-2 text-muted-foreground">
                            Cancel
                        </Button>
                        <h4 className="font-bold text-sm">Create New Set</h4>
                        <div className="w-10" />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Set Title</label>
                            <Input
                                placeholder="e.g. Advanced Biology"
                                value={newSetTitle}
                                onChange={(e) => setNewSetTitle(e.target.value)}
                                className="h-12 rounded-xl bg-secondary/30 border-border/50 focus:border-primary/50 text-lg font-bold"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <Button
                            className="w-full rounded-xl h-12 font-bold shadow-premium hover:shadow-premium-hover"
                            onClick={handleCreate}
                            disabled={createSetMutation.isPending || !newSetTitle.trim()}
                        >
                            {createSetMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                            Create & Link
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={(o) => {
                setOpen(o);
                if (!o) setView('list');
            }}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "h-9 px-3 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 transition-all",
                            selectedSetId ? "border-primary/30 text-primary bg-primary/5" : "text-muted-foreground"
                        )}
                    >
                        {selectedSet ? (
                            <span className="flex items-center gap-2 max-w-[140px]">
                                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate font-bold text-xs">{selectedSet.title}</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <LinkIcon className="h-3.5 w-3.5 opacity-70" />
                                <span className="text-xs font-medium">Link Set</span>
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[2rem] p-0 overflow-hidden h-auto max-h-[85vh]">
                    <SheetHeader className="p-4 border-b bg-background/50 backdrop-blur-sm">
                        <SheetTitle className="text-center font-black">Link to Study Set</SheetTitle>
                    </SheetHeader>
                    {SelectorContent}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Popover open={open} onOpenChange={(o) => {
            setOpen(o);
            if (!o) setView('list');
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-[220px] justify-between h-9 text-xs rounded-xl shadow-sm border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all",
                        selectedSetId && "border-solid border-primary/30 bg-primary/5 text-primary shadow-premium-sm"
                    )}
                >
                    {selectedSet ? (
                        <span className="truncate flex items-center gap-2 font-bold">
                            <LinkIcon className="h-3 w-3" />
                            {selectedSet.title}
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 font-medium text-muted-foreground">
                            <LinkIcon className="h-3 w-3" /> Link Study Set
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-xl overflow-hidden shadow-2xl border-border/50" align="end">
                {SelectorContent}
            </PopoverContent>
        </Popover>
    );
};
