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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase.rpc('admin_get_stats');
                if (error) throw error;
                // admin_get_stats returns Json, assert it's AdminStats structure
                if (data && Array.isArray(data) && data.length > 0) {
                    setStats(data[0] as unknown as AdminStats);
                } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                    setStats(data as unknown as AdminStats);
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
            title: "Banned Users",
            value: stats?.banned_users || 0,
            icon: ShieldAlert,
            description: "Restricted accounts",
            color: "text-red-600",
            bg: "bg-red-100"
        },
        {
            title: "Admin Staff",
            value: stats?.admins || 0,
            icon: Activity,
            description: "System administrators",
            color: "text-emerald-600",
            bg: "bg-emerald-100"
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

            {/* Placeholder for Activity Feed */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-[200px] text-muted-foreground border-2 border-dashed rounded-lg">
                            Activity Feed Coming Soon
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Database Status</span>
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">HEALTHY</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">API Latency</span>
                                <span className="text-sm text-muted-foreground">24ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Storage Usage</span>
                                <span className="text-sm text-muted-foreground">45%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
