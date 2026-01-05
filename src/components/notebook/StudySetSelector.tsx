import * as React from "react";
import { Check, ChevronsUpDown, Link as LinkIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StudySetSelectorProps {
    selectedSetId: string | null;
    onSelectSet: (setId: string | null) => void;
}

export const StudySetSelector: React.FC<StudySetSelectorProps> = ({
    selectedSetId,
    onSelectSet,
}) => {
    const [open, setOpen] = React.useState(false);
    const { user } = useAuth();

    const { data: studySets = [] } = useQuery({
        queryKey: ['my-study-sets-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('study_sets')
                .select('id, title')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const selectedSet = studySets.find(set => set.id === selectedSetId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-[200px] justify-between h-9 text-xs",
                        !selectedSetId && "text-muted-foreground dashed border-dashed"
                    )}
                >
                    {selectedSet ? (
                        <span className="truncate flex items-center gap-1 font-medium text-primary">
                            <LinkIcon className="h-3 w-3" />
                            {selectedSet.title}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" /> Link Study Set
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search study sets..." />
                    <CommandList>
                        <CommandEmpty>No study set found.</CommandEmpty>
                        <CommandGroup>
                            {selectedSetId && (
                                <CommandItem
                                    value="none"
                                    onSelect={() => {
                                        onSelectSet(null);
                                        setOpen(false);
                                    }}
                                    className="text-destructive font-medium"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Unlink Set
                                </CommandItem>
                            )}
                            {studySets.map((set) => (
                                <CommandItem
                                    key={set.id}
                                    value={set.title}
                                    onSelect={() => {
                                        onSelectSet(set.id === selectedSetId ? null : set.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedSetId === set.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{set.title}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
