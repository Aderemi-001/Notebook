import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ErrorLog {
    id: string;
    error_message: string;
    url: string | null;
    user_agent: string | null;
    is_resolved: boolean | null;
    created_at: string;
    user_id?: string | null;
    component_stack?: string | null;
}

export const AdminLogs = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching logs:', error);
        } else {
            // Transform to match ErrorLog interface (handle nulls)
            const transformedLogs = (data || []).map(log => ({
                ...log,
                url: log.url || null,
                user_agent: log.user_agent || null,
                is_resolved: log.is_resolved ?? false,
            }));
            setLogs(transformedLogs);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const toggleResolved = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('error_logs')
            .update({ is_resolved: !currentStatus })
            .eq('id', id);

        if (error) {
            toast({ variant: "destructive", title: "Failed to update log" });
        } else {
            toast({ title: "Log updated", description: `Marked as ${!currentStatus ? 'resolved' : 'unresolved'}` });
            fetchLogs();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
                <Button onClick={fetchLogs} variant="outline">Refresh Logs</Button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No errors reported. System healthy.</div>
                ) : (
                    logs.map(log => (
                        <Card key={log.id} className={`border-l-4 ${log.is_resolved ? 'border-l-green-500' : 'border-l-red-500'}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        {log.is_resolved ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <ShieldAlert className="h-4 w-4 text-red-500" />
                                        )}
                                        {log.error_message}
                                    </CardTitle>
                                    <CardDescription className="text-xs font-mono break-all text-muted-foreground">
                                        {log.url}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant={log.is_resolved ? "outline" : "destructive"}>
                                        {log.is_resolved ? "Resolved" : "Unresolved"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        size="sm"
                                        variant={log.is_resolved ? "ghost" : "default"}
                                        onClick={() => toggleResolved(log.id, log.is_resolved ?? false)}
                                    >
                                        Mark as {log.is_resolved ? 'Unresolved' : 'Resolved'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
