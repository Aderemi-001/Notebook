import { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, FileText, Ban, Crown, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface AdminLog {
    id: string;
    action: string;
    admin_email: string;
    admin_name: string;
    details: any;
    created_at: string;
}

export const AdminLogs = () => {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data, error } = await supabase.rpc('admin_get_logs');
                if (error) throw error;
                setLogs(data as AdminLog[]);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'BAN_USER': return <Ban className="h-4 w-4 text-red-500" />;
            case 'UNBAN_USER': return <ShieldAlert className="h-4 w-4 text-green-500" />;
            case 'GRANT_PREMIUM': return <Crown className="h-4 w-4 text-amber-500" />;
            case 'DELETE_SET': return <Trash2 className="h-4 w-4 text-red-500" />;
            default: return <FileText className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                <p className="text-muted-foreground mt-1">
                    Audit trail of administrative actions.
                </p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            {getActionIcon(log.action)}
                                            {log.action.replace(/_/g, ' ')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{log.admin_name}</span>
                                            <span className="text-xs text-muted-foreground">{log.admin_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                            {JSON.stringify(log.details)}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-sm">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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
