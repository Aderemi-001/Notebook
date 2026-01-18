import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, ShieldAlert, Activity, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';

interface AdminStats {
    total_users: number;
    active_subscriptions: number;
    banned_users: number;
    admins: number;
}

interface RevenueStats {
    today: number;
    month: number;
    total: number;
}

interface Transaction {
    id: string;
    user_email: string;
    amount: number;
    status: string;
    plan: string;
    provider_ref: string;
    created_at: string;
}

interface PaidUser {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    subscription_status: string;
    current_period_end: string | null;
    created_at: string;
}

export const AdminOverview = () => {
    const [stats, setStats] = useState<AdminStats>({
        total_users: 0,
        active_subscriptions: 0,
        banned_users: 0,
        admins: 0
    });
    const [revenue, setRevenue] = useState<RevenueStats>({ today: 0, month: 0, total: 0 });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    // Paid Subscribers State
    const [isSubscribersOpen, setIsSubscribersOpen] = useState(false);
    const [paidUsers, setPaidUsers] = useState<PaidUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const navigate = useNavigate();

    const isSandbox = import.meta.env.VITE_PAYFAST_SANDBOX === 'true';

    const fetchStats = async () => {
        try {
            setLoading(true);
            // 1. General Stats
            const { data: statsData } = await supabase.rpc('admin_get_stats');
            if (statsData) {
                setStats(statsData as unknown as AdminStats);
            }

            // 2. Revenue Stats
            const { data: revData } = await supabase.rpc('admin_get_revenue');
            if (revData) {
                setRevenue(revData as any);
            }

            // 3. Recent Transactions
            const { data: txns } = await supabase.rpc('admin_get_recent_transactions', { limit_count: 5 });
            if (txns && Array.isArray(txns)) {
                setRecentTransactions(txns as unknown as Transaction[]);
            }

            setLastSync(new Date());

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaidUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_users');
            if (error) throw error;

            const mappedUsers: PaidUser[] = (data as any[])
                .map(row => ({
                    id: row.user_id_out,
                    email: row.email_out,
                    display_name: row.display_name_out,
                    avatar_url: row.avatar_url_out,
                    subscription_status: row.subscription_status_out,
                    current_period_end: row.current_period_end_out,
                    created_at: row.created_at_out
                }))
                .filter(u => u.subscription_status === 'active' || u.subscription_status === 'pro');

            setPaidUsers(mappedUsers);
        } catch (error) {
            console.error('Error fetching paid users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (isSubscribersOpen) {
            fetchPaidUsers();
        }
    }, [isSubscribersOpen]);

    const statCards = [
        {
            title: "Total Users",
            value: stats.total_users,
            description: "Registered accounts",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
            title: "Active Pro",
            value: stats.active_subscriptions,
            description: "Paid subscriptions",
            icon: CreditCard,
            color: "text-green-600",
            bg: "bg-green-100 dark:bg-green-900/20"
        },
        {
            title: "Admins",
            value: stats.admins,
            description: "Staff members",
            icon: ShieldAlert,
            color: "text-purple-600",
            bg: "bg-purple-100 dark:bg-purple-900/20"
        },
        {
            title: "Revenue (Today)",
            value: `R${(revenue?.today || 0).toLocaleString()}`,
            description: "Daily income",
            icon: Activity,
            color: "text-emerald-600",
            bg: "bg-emerald-100 dark:bg-emerald-900/20"
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
                    <Card
                        key={index}
                        className={`border-none shadow-sm hover:shadow-md transition-all ${stat.title === "Active Pro" ? "cursor-pointer hover:ring-2 hover:ring-green-500/20" : ""}`}
                        onClick={() => stat.title === "Active Pro" && setIsSubscribersOpen(true)}
                    >
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
                            <p className="text-xs text-muted-foreground mt-1 text-balance">
                                {stat.description}
                                {stat.title === "Active Pro" && !loading && (
                                    <span className="ml-1 text-[10px] text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-1 rounded inline-flex items-center gap-0.5">
                                        View <ExternalLink className="h-2 w-2" />
                                    </span>
                                )}
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
                                    {loading ? 'Loading transactions...' : 'No recent transactions found.'}
                                </div>
                            ) : (
                                recentTransactions.map((txn) => {
                                    const getStatusDetails = (status: string) => {
                                        switch (status) {
                                            case 'completed': return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: CreditCard, label: 'Success' };
                                            case 'pending': return { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: Activity, label: 'Pending' };
                                            case 'failed': return { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: ShieldAlert, label: 'Failed' };
                                            case 'cancelled': return { color: 'bg-slate-100 dark:bg-slate-800 text-slate-500', icon: ShieldAlert, label: 'Cancelled' };
                                            default: return { color: 'bg-gray-100 text-gray-700', icon: CreditCard, label: status };
                                        }
                                    };
                                    const style = getStatusDetails(txn.status);
                                    const Icon = style.icon;

                                    return (
                                        <div key={txn.id} className="flex items-center justify-between border-b dark:border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-full ${style.color} group-hover:scale-110 transition-transform`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold flex items-center gap-2">
                                                        {txn.user_email || 'Unknown User'}
                                                        {txn.status === 'completed' && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">PRO</span>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <span className="capitalize">{txn.plan || 'One-time Payment'}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="font-mono text-[10px] opacity-70">{txn.provider_ref?.substring(0, 8) || 'No Ref'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${txn.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
                                                    R{Number(txn.amount).toFixed(2)}
                                                </div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${style.label === 'Failed' ? 'text-red-500' : (style.label === 'Pending' ? 'text-amber-500' : 'text-green-500')}`}>
                                                    {style.label}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground pt-0.5">{new Date(txn.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    );
                                })
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
                            <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">R{revenue?.today.toLocaleString() || '0.00'}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Real-time synced
                            </span>
                        </div>
                        <div className="space-y-4 mt-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <span className="text-sm font-medium">Gateway</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${isSandbox ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700'}`}>
                                    {isSandbox ? 'PAYFAST SANDBOX' : 'PAYFAST LIVE'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                                <span className="text-sm font-medium">Last Sync</span>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {lastSync.toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Sheet open={isSubscribersOpen} onOpenChange={setIsSubscribersOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] border-l dark:border-white/10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl p-0">
                    <SheetHeader className="p-6 pb-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
                                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold">Active Pro Subscribers</SheetTitle>
                                <SheetDescription>
                                    A list of users with currently active pro subscriptions.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="mt-8 px-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                        {loadingUsers ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                                <p className="text-sm text-muted-foreground font-medium">Synchronizing neural subscriber list...</p>
                            </div>
                        ) : paidUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-muted-foreground">No active subscribers found.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border dark:border-white/5 bg-white dark:bg-white/5 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                                        <TableRow>
                                            <TableHead className="w-[200px]">User</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Expires</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paidUsers.map((user) => (
                                            <TableRow
                                                key={user.id}
                                                className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                                                onClick={() => {
                                                    setIsSubscribersOpen(false);
                                                    navigate('/admin?tab=users&search=' + user.email);
                                                }}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 border border-white dark:border-slate-800">
                                                            <AvatarImage src={user.avatar_url || ''} />
                                                            <AvatarFallback className="bg-green-100 text-green-700 text-[10px]">
                                                                {(user.display_name || user.email).substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-semibold truncate max-w-[120px]">
                                                                {user.display_name || 'Anonymous User'}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none text-[10px] px-1.5 py-0">
                                                        PRO
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">
                                                            {user.current_period_end ? new Date(user.current_period_end).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {user.current_period_end ? new Date(user.current_period_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 mb-8">
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                                <span className="font-bold">Pro Tip:</span> Tapping a user will redirect you to the full User Management tab with that user pre-selected for inspection.
                            </p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};
