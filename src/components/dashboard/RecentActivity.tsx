import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
    id: string;
    title: string;
    updated_at: string;
    type: 'set' | 'note';
}

const RecentActivity: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: recentItems, isLoading } = useQuery({
        queryKey: ['recent-activity', user?.id],
        queryFn: async () => {
            if (!user) return [];

            // Fetch recent sets
            const { data: sets } = await supabase
                .from('study_sets')
                .select('id, title, updated_at')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(3);

            // Fetch recent notes
            const { data: notes } = await supabase
                .from('notes')
                .select('id, title, updated_at')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(3);

            // Combine and sort, filtering out items with null updated_at
            const combined: ActivityItem[] = [
                ...(sets || []).filter(s => s.updated_at).map(s => ({ ...s, type: 'set' as const, updated_at: s.updated_at! })),
                ...(notes || []).filter(n => n.updated_at).map(n => ({ ...n, type: 'note' as const, updated_at: n.updated_at! }))
            ];

            return combined
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 6);
        },
        enabled: !!user,
    });

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                {recentItems && recentItems.length > 0 ? (
                    <div className="space-y-2">
                        {recentItems.map((item) => (
                            <button
                                key={`${item.type}-${item.id}`}
                                onClick={() => navigate(item.type === 'set' ? `/sets/${item.id}` : `/notebook`)}
                                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {item.type === 'set' ? (
                                        <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-green-600 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No recent activity yet. Create a set or note to get started!
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentActivity;
