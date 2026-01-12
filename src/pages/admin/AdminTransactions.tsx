
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    provider_ref: string;
    created_at: string;
    metadata: any;
}

export default function AdminTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Check if table exists implicitly by catching error
            const { data, error } = await (supabase as any)
                .from('payment_transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Determine if 404/missing table
                if (error.code === '42P01') { // PostgreSQL undefined_table
                    throw new Error("Table 'payment_transactions' does not exist. Please run the migration SQL.");
                }
                throw error;
            }

            setTransactions(data || []);
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            toast({
                variant: 'destructive',
                title: 'Error loading transactions',
                description: error.message || 'Could not fetch payment history.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
            case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
            case 'failed': return <Badge variant="destructive">Failed</Badge>;
            case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                <p className="text-muted-foreground">
                    View and audit all PayFast payment attempts.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Payment History</CardTitle>
                        <CardDescription>Real-time log of all transactions.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    {!loading && transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <CreditCard className="h-12 w-12 mb-4 opacity-20" />
                            <p>No transactions found.</p>
                            <p className="text-sm">(Or the table hasn't been created yet)</p>
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead className="text-right">Validation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((txn) => (
                                        <TableRow key={txn.id}>
                                            <TableCell className="font-medium">
                                                {new Date(txn.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(txn.status)}
                                            </TableCell>
                                            <TableCell>
                                                {txn.currency} {txn.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground" title={txn.user_id}>
                                                {txn.user_id.slice(0, 8)}...
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {txn.provider_ref || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {txn.status === 'completed' && (
                                                    <Badge variant="outline" className="border-green-500 text-green-600">
                                                        Authenticated
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
