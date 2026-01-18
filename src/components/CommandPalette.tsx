import * as React from "react";
import {
    BookOpen,
    FileText,
    Plus,
    LayoutDashboard,
    NotebookPen,
    CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { globalSearch, SearchResult } from "@/services/searchService";
import { useAuth } from "@/hooks/useAuth";
import { DialogTitle } from "@radix-ui/react-dialog";

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Debounce search
    React.useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await globalSearch(query);
                setResults(data);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard shortcut
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    if (!user) return null;

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <DialogTitle className="sr-only">Command Palette</DialogTitle>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>
                        {loading ? "Searching..." : "No results found."}
                    </CommandEmpty>

                    {!query && (
                        <>
                            <CommandGroup heading="Quick Actions">
                                <CommandItem onSelect={() => runCommand(() => navigate("/notebook?new=true"))}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Create New Note</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => navigate("/create"))}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Create Study Set</span>
                                </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Navigation">
                                <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => navigate("/notebook"))}>
                                    <NotebookPen className="mr-2 h-4 w-4" />
                                    <span>Notebook</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => navigate("/sets"))}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    <span>My Study Sets</span>
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}

                    {query && results.length > 0 && (
                        <CommandGroup heading="Search Results">
                            {results.map((result) => (
                                <CommandItem
                                    key={`${result.type}-${result.id}`}
                                    onSelect={() => runCommand(() => navigate(result.url))}
                                    value={result.title} // cmdk uses this for filtering internally, but we handle search externally. Providing it helps.
                                >
                                    {result.type === 'set' ? (
                                        <BookOpen className="mr-2 h-4 w-4 text-blue-500" />
                                    ) : result.type === 'card' ? (
                                        <CreditCard className="mr-2 h-4 w-4 text-purple-500" />
                                    ) : (
                                        <FileText className="mr-2 h-4 w-4 text-green-500" />
                                    )}
                                    <span>{result.title}</span>
                                    {result.description && (
                                        <span className="ml-2 text-xs text-muted-foreground truncate max-w-[200px]">{result.description}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
