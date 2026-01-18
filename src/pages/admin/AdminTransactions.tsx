
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
                                    {transactions.map((txn) => {
                                        const getStatusDetails = (status: string) => {
                                            switch (status) {
                                                case 'completed': return { color: 'bg-green-100 text-green-700', icon: CreditCard, label: 'Success' };
                                                case 'pending': return { color: 'bg-amber-100 text-amber-700', icon: Loader2, label: 'Pending' };
                                                case 'failed': return { color: 'bg-red-100 text-red-700', icon: CreditCard, label: 'Failed' };
                                                case 'cancelled': return { color: 'bg-slate-100 text-slate-500', icon: CreditCard, label: 'Cancelled' };
                                                default: return { color: 'bg-gray-100 text-gray-700', icon: CreditCard, label: status };
                                            }
                                        };
                                        const style = getStatusDetails(txn.status);
                                        const Icon = style.icon;

                                        return (
                                            <TableRow key={txn.id} className="group hover:bg-muted/50">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                                                        <span className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleTimeString()}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`flex items-center gap-2 w-fit px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.color.replace('bg-', 'border-').replace('text-', 'border-').split(' ')[0]} ${style.color}`}>
                                                        <Icon className="h-3 w-3" />
                                                        <span className="capitalize">{style.label}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {txn.currency} {txn.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground" title={txn.user_id}>
                                                    {txn.user_id}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {txn.provider_ref ? (
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{txn.provider_ref}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic opacity-50">Pending Ref</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {txn.status === 'completed' && (
                                                        <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                                                            Verified
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
