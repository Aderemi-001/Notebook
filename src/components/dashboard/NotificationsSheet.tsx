
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Trash2, Clock, Info, ShieldAlert, Sparkles, LogIn, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDistanceToNow } from '@/utils/dateUtils';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Notification {
    id: string;
    created_at: string;
    message: string;
    is_read: boolean;
    type?: 'info' | 'warning' | 'alert' | 'broadcast';
    title?: string;
}

interface NotificationsSheetProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const NotificationsSheet = ({ open, onOpenChange }: NotificationsSheetProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [internalOpen, setInternalOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

    // 1. Fetch Notifications with React Query (Shared Cache)
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Notification[];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes stale time
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // 2. Real-time Subscription (Updates Cache)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to ALL events (Insert, Update, Delete)
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    // Invalidate query to refetch fresh data
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    // 3. Mutations
    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);

            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) =>
                old ? old.map(n => n.id === id ? { ...n, is_read: true } : n) : []
            );

            return { previousNotifications };
        },
        onError: () => {
            showError('Failed to update notification');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length === 0) return;
            const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
            if (error) throw error;
        },
        onSuccess: () => {
            showSuccess('All marked as read');
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw error;
        },
        onMutate: async (id) => {
            // Optimistic Delete
            await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
            const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);

            queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) =>
                old ? old.filter(n => n.id !== id) : []
            );

            return { previousNotifications };
        },
        onError: () => {
            showError('Failed to delete notification');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        }
    });


    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full w-10 h-10 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors group">
                    <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-[10px] font-bold border-2 border-background animate-in zoom-in"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/40">
                <SheetHeader className="p-4 border-b border-border/40 bg-card/50">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                            Inbox
                            {unreadCount > 0 && (
                                <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full ring-1 ring-primary/20">
                                    {unreadCount} unread
                                </span>
                            )}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending}
                                className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
                            >
                                <Check className="h-3 w-3 mr-1" /> Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-0">
                    {!user ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full animate-in fade-in">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
                                <ShieldAlert className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Sign in required</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
                                Please sign in to view your notifications and updates.
                            </p>
                            <Button asChild className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                <a href="/login">
                                    <LogIn className="mr-2 h-4 w-4" /> Sign In
                                </a>
                            </Button>
                        </div>
                    ) : isLoading && notifications.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <p className="text-sm">Syncing inbox...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground opacity-60 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-base font-bold">All caught up!</p>
                            <p className="text-sm">You have no new notifications.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30 pb-24">
                            {notifications.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => {
                                        setSelectedNotification(note);
                                        if (!note.is_read) {
                                            markAsReadMutation.mutate(note.id);
                                        }
                                    }}
                                    className={cn(
                                        "p-4 transition-all hover:bg-muted/40 group cursor-pointer relative animate-in fade-in",
                                        !note.is_read ? "bg-primary/5 hover:bg-primary/10" : ""
                                    )}
                                >
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                            note.type === 'alert' ? "bg-red-500/10 text-red-600 border-red-200" :
                                                note.type === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                                                    note.type === 'broadcast' ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" :
                                                        "bg-blue-500/10 text-blue-600 border-blue-200"
                                        )}>
                                            {note.type === 'alert' ? <ShieldAlert className="h-4 w-4" /> :
                                                note.type === 'warning' ? <Info className="h-4 w-4" /> :
                                                    note.type === 'broadcast' ? <Sparkles className="h-4 w-4" /> :
                                                        <Bell className="h-4 w-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn("text-sm leading-snug", !note.is_read ? "font-bold text-foreground" : "text-muted-foreground")}>
                                                    {note.title || note.message}
                                                </p>
                                                {!note.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-glow" />
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center text-[10px] text-muted-foreground/70 font-medium">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {safeFormatDistanceToNow(note.created_at)}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-primary active:scale-95"
                                                    >
                                                        <Maximize2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive active:scale-95"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteMutation.mutate(note.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <Dialog open={!!selectedNotification} onOpenChange={(open: boolean) => !open && setSelectedNotification(null)}>
                    <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-[2rem]">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                    selectedNotification?.type === 'alert' ? "bg-red-500/10 text-red-600 border-red-200" :
                                        selectedNotification?.type === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                                            selectedNotification?.type === 'broadcast' ? "bg-indigo-500/10 text-indigo-600 border-indigo-200" :
                                                "bg-blue-500/10 text-blue-600 border-blue-200"
                                )}>
                                    {selectedNotification?.type === 'alert' ? <ShieldAlert className="h-5 w-5" /> :
                                        selectedNotification?.type === 'warning' ? <Info className="h-5 w-5" /> :
                                            selectedNotification?.type === 'broadcast' ? <Sparkles className="h-5 w-5" /> :
                                                <Bell className="h-5 w-5" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black tracking-tight">
                                        {selectedNotification?.title || 'Notification'}
                                    </DialogTitle>
                                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {selectedNotification && safeFormatDistanceToNow(selectedNotification.created_at)}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/20">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {selectedNotification?.message}
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedNotification(null)}
                                className="rounded-xl font-bold"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </SheetContent>
        </Sheet>
    );
};
