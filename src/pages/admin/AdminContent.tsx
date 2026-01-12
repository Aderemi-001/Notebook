import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Trash2,
    Eye,
    Globe,
    Lock,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Link } from 'react-router-dom';

interface StudySetResult {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    created_at: string;
    creator_name: string | null;
    creator_email: string | null;
    card_count: number;
}

export const AdminContent = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StudySetResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            // Use search_user_cards which returns card results, then map to study sets
            const { data: cardResults, error } = await supabase.rpc('search_user_cards', { search_query: query });
            if (error) throw error;
            // Transform card results to study set results (simplified - you may want to fetch full set details)
            const uniqueSetIds = new Set(cardResults?.map((c: any) => c.set_id) || []);
            const transformedResults = Array.from(uniqueSetIds).map((setId: string) => {
                const card = cardResults?.find((c: any) => c.set_id === setId);
                return {
                    id: setId,
                    title: card?.set_title || 'Unknown',
                    description: null,
                    is_public: false,
                    user_id: '',
                    created_at: '',
                    updated_at: '',
                    cards_count: cardResults?.filter((c: any) => c.set_id === setId).length || 0,
                    card_count: cardResults?.filter((c: any) => c.set_id === setId).length || 0,
                    creator_name: null,
                    creator_email: null
                } as StudySetResult;
            });
            setResults(transformedResults);
        } catch (error: any) {
            console.error('Error searching content:', error);
            showError(`Search failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (setId: string) => {
        setDeletingId(setId);
        try {
            // Delete via direct table delete since admin_delete_set doesn't exist in types
            const { error } = await supabase.from('study_sets').delete().eq('id', setId);
            if (error) throw error;

            showSuccess('Study set deleted permanently.');
            setResults(results.filter(s => s.id !== setId));
        } catch (error: any) {
            showError(`Delete failed: ${error.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
                <p className="text-muted-foreground mt-1">
                    Search and manage study sets across the entire platform.
                </p>
            </div>

            <div className="flex gap-4 max-w-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, description, or user..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-9"
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Cards</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {loading ? "Searching..." : "Enter a search term to find content."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            results.map((set) => (
                                <TableRow key={set.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium line-clamp-1">{set.title}</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1">{set.description || 'No description'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{set.creator_name || 'Anonymous'}</span>
                                            <span className="text-xs text-muted-foreground">{set.creator_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {set.is_public ? (
                                            <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                                <Globe className="h-3 w-3" /> Public
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                <Lock className="h-3 w-3" /> Private
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{set.card_count}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(set.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link to={`/sets/${set.id}`} target="_blank">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                            <AlertTriangle className="h-5 w-5" /> Force Delete Content?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This study set and all it's cards will be permanently removed from the database immediately.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(set.id)}
                                                            className="bg-red-600 hover:bg-red-700"
                                                        >
                                                            {deletingId === set.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                            Force Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
