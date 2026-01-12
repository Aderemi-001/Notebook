import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, ShieldAlert, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
    total_users: number;
    active_subscriptions: number;
    banned_users: number;
    admins: number;
}

export const AdminOverview = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [revenue, setRevenue] = useState<{ total: number; today: number } | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. General Stats
                const { data: statsData } = await supabase.rpc('admin_get_stats');
                if (statsData && Array.isArray(statsData) && statsData.length > 0) {
                    setStats(statsData[0] as unknown as AdminStats);
                }

                // 2. Revenue Stats
                const { data: revData } = await supabase.rpc('admin_get_revenue' as any);
                if (revData) {
                    setRevenue(revData as any);
                }

                // 3. Recent Transactions
                const { data: txns } = await supabase.rpc('admin_get_recent_transactions' as any, { limit_count: 5 });
                if (txns && Array.isArray(txns)) {
                    setRecentTransactions(txns);
                }

            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            title: "Total Users",
            value: stats?.total_users || 0,
            icon: Users,
            description: "Registered accounts",
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            title: "Active Pro Subs",
            value: stats?.active_subscriptions || 0,
            icon: CreditCard,
            description: "Revenue generating",
            color: "text-indigo-600",
            bg: "bg-indigo-100"
        },
        {
            title: "Total Profit",
            value: revenue ? `R${revenue.total.toLocaleString()}` : "R0.00",
            icon: Activity,
            description: `+R${revenue?.today.toLocaleString() || 0} today`,
            color: "text-emerald-600",
            bg: "bg-emerald-100"
        },
        {
            title: "Banned Users",
            value: stats?.banned_users || 0,
            icon: ShieldAlert,
            description: "Restricted accounts",
            color: "text-red-600",
            bg: "bg-red-100"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back to the command center.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? "..." : stat.value}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    No recent transactions found.
                                </div>
                            ) : (
                                recentTransactions.map((txn) => (
                                    <div key={txn.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${txn.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                <CreditCard className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{txn.user_email || 'Unknown User'}</div>
                                                <div className="text-xs text-muted-foreground">{txn.plan || 'Payment'}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold">R{txn.amount}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Live Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 space-y-2">
                            <span className="text-muted-foreground text-sm uppercase tracking-wider">Today's Earnings</span>
                            <span className="text-4xl font-extrabold text-emerald-600">R{revenue?.today.toLocaleString() || '0.00'}</span>
                            <span className="text-xs text-muted-foreground">Real-time synced</span>
                        </div>
                        <div className="space-y-4 mt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Gateway</span>
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">PAYFAST ONLINE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Last Sync</span>
                                <span className="text-sm text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
