import { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    Loader2,
    Siren,
    Zap,
    ShieldCheck,
    Lock,
    Search,
    ShieldAlert,
    Activity,
    Shield,
    Fingerprint
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Mail, Key, ShieldOff, Trash, AlertTriangle, Crown, UserX, UserCheck } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUser {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string;
    subscription_status: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
    granted_by_email: string | null;
    granted_at: string | null;
    granted_duration: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    total_notes: number;
    total_sets: number;
    is_exempt: boolean;
    risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface AdminAlert {
    id: string;
    user_id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    action_taken: string | null;
    created_at: string;
    resolved: boolean;
}

export const AdminUsers = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Security Scan State
    const [alerts, setAlerts] = useState<AdminAlert[]>([]);
    const [scanLoading, setScanLoading] = useState(false);
    const [activeDefense, setActiveDefense] = useState(false);

    // New state for premium duration
    const [premiumDuration, setPremiumDuration] = useState('1 year');

    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [lastSweep, setLastSweep] = useState<string | null>(null);

    // Confirmation Dialog State
    const [confirmConfig, setConfirmConfig] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
    }>({
        open: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    const openConfirm = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
        setConfirmConfig({ open: true, title, description, onConfirm, variant });
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_users');
            if (error) throw error;

            // Map the unique V5 output names back to our interface
            const mappedUsers: AdminUser[] = (data as any[]).map(row => ({
                id: row.user_id_out,
                email: row.email_out,
                display_name: row.display_name_out,
                avatar_url: row.avatar_url_out,
                is_admin: row.is_admin_out,
                is_banned: row.is_banned_out,
                created_at: row.created_at_out,
                last_sign_in_at: row.last_sign_in_at_out,
                email_confirmed_at: row.email_confirmed_at_out,
                subscription_status: row.subscription_status_out,
                current_period_end: row.current_period_end_out,
                trial_ends_at: row.trial_ends_at_out,
                granted_by_email: row.granted_by_email_out,
                granted_at: row.granted_at_out,
                granted_duration: row.granted_duration_out,
                total_notes: Number(row.total_notes_out),
                total_sets: Number(row.total_sets_out),
                is_exempt: row.is_exempt_out,
                risk_score: Number(row.risk_score_out),
                risk_level: row.risk_level_out as any
            }));

            setUsers(mappedUsers);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            showError(`Failed to load users: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from('security_alerts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlerts(data as AdminAlert[]);
        } catch (error: any) {
            console.error('Error fetching alerts:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'security_sentinel_mode')
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data?.value) {
                setActiveDefense((data.value as any).active_defense || false);
            }

            // Also fetch the last autonomous sweep from logs
            const { data: logData } = await supabase
                .from('admin_logs')
                .select('created_at')
                .eq('action', 'SENTINEL_AUTONOMOUS_SWEEP')
                .order('created_at', { ascending: false })
                .limit(1);

            if (logData?.[0]) {
                setLastSweep(logData[0].created_at);
            }
        } catch (error: any) {
            console.error('Error fetching settings:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchAlerts();
        fetchSettings();
    }, []);

    const handleToggleActiveDefense = async (enabled: boolean) => {
        setActiveDefense(enabled);
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'security_sentinel_mode',
                    value: { active_defense: enabled },
                    updated_by: (await supabase.auth.getUser()).data.user?.id
                });
            if (error) throw error;
            showSuccess(`Enforcement protocols ${enabled ? 'AUTHORIZED' : 'DE-ESCALATED'}.`);
        } catch (error: any) {
            showError(`Failed to save protocol: ${error.message}`);
        }
    };

    const handleRunScan = async () => {
        setScanLoading(true);
        try {
            const { data, error } = await supabase.rpc('run_security_scan', {
                p_active_defense: activeDefense
            });
            if (error) throw error;

            const result = data && data[0] ? data[0] : { alerts_created: 0, users_banned: 0 };

            let message = `Scan Complete. Found ${result.alerts_created} anomalies.`;
            if (result.users_banned > 0) {
                message += ` 🛡️ ACTIVELY BLOCKED ${result.users_banned} THREATS.`;
            }

            if (result.alerts_created > 0 || result.users_banned > 0) {
                showSuccess(message);
                fetchAlerts();
                fetchUsers(); // Refresh users to see bans
            } else {
                showSuccess('System Clean. No threats detected.');
            }
        } catch (error: any) {
            showError(`Scan Failed: ${error.message}`);
        } finally {
            setScanLoading(false);
        }
    };

    const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.rpc('admin_ban_user', {
                target_user_id: userId,
                ban: !currentBanStatus
            });
            if (error) throw error;

            showSuccess(`User ${!currentBanStatus ? 'banned' : 'unbanned'} successfully.`);
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentBanStatus } : u));
        } catch (error: any) {
            showError(`Action failed: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleGrantPremium = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.rpc('admin_grant_premium', {
                target_user_id: userId,
                duration_interval: premiumDuration
            });
            if (error) throw error;

            showSuccess(`Premium granted successfully (${premiumDuration}).`);
            fetchUsers();
            // setUsers(users.map(u => u.id === userId ? { ...u, subscription_status: 'active' } : u));
        } catch (error: any) {
            showError(`Failed to grant premium: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevokePremium = async (userId: string) => {
        openConfirm(
            'Revoke Premium Membership?',
            'Are you sure you want to revoke premium access for this user? This will immediately cancel their benefits.',
            async () => {
                setActionLoading(userId);
                try {
                    const { error } = await supabase.rpc('admin_revoke_premium', {
                        target_user_id: userId
                    });
                    if (error) throw error;

                    showSuccess('Premium access revoked successfully.');
                    setUsers(users.map(u => u.id === userId ? { ...u, subscription_status: 'canceled' } : u));
                } catch (error: any) {
                    showError(`Failed to revoke premium: ${error.message}`);
                } finally {
                    setActionLoading(null);
                }
            },
            'destructive'
        );
    };

    const handleResetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            showSuccess('Password reset email sent.');
        } catch (error: any) {
            showError(`Failed to send reset email: ${error.message}`);
        }
    };

    const handleMagicLink = async (email: string) => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            showSuccess('Magic link sent to user.');
        } catch (error: any) {
            showError(`Failed to send magic link: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        openConfirm(
            'Permanently Delete User?',
            'This action is irreversible. All user data, notes, and study sets will be permanently purged from the neural library.',
            async () => {
                setActionLoading(userId);
                try {
                    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
                    if (error) throw error;

                    showSuccess('User permanently deleted.');
                    setUsers(users.filter(u => u.id !== userId));
                    setSelectedUser(null);
                } catch (error: any) {
                    showError(`Delete failed: ${error.message}`);
                } finally {
                    setActionLoading(null);
                }
            },
            'destructive'
        );
    };

    const handleRemoveMFA = async (userId: string) => {
        openConfirm(
            'Remove Security Factors?',
            'This will disable all Multi-Factor Authentication for this user. They will be able to log in with just their primary credentials.',
            async () => {
                setActionLoading(userId);
                try {
                    const { error } = await supabase.rpc('admin_remove_mfa', { target_user_id: userId });
                    if (error) throw error;

                    showSuccess('MFA factors removed.');
                } catch (error: any) {
                    showError(`Failed to remove MFA: ${error.message}`);
                } finally {
                    setActionLoading(null);
                }
            },
            'destructive'
        );
    };


    const handleToggleImmunity = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        try {
            if (currentStatus) {
                // Revoke Immunity
                const { error } = await supabase.from('security_exceptions').delete().eq('user_id', userId);
                if (error) throw error;
                showSuccess('Diplomatic Immunity revoked.');
            } else {
                // Grant Immunity
                const { error } = await supabase.from('security_exceptions').insert({
                    user_id: userId,
                    reason: 'Admin Granted Immunity'
                });
                if (error) throw error;
                showSuccess('Diplomatic Immunity granted.');
            }

            // Refresh
            fetchUsers();
            // Optimistic update
            if (selectedUser?.id === userId) {
                setSelectedUser({ ...selectedUser, is_exempt: !currentStatus });
            }
        } catch (error: any) {
            showError(`Failed to update immunity: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-1">
                        View, manage, and moderate user accounts.
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Siren className="h-4 w-4" />
                        Security Operations
                        {alerts.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {alerts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-6">
                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Risk Score</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No users found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={user.avatar_url || undefined} />
                                                        <AvatarFallback>{user.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-sm">{user.display_name || 'Unnamed User'}</span>
                                                            {user.email_confirmed_at && (
                                                                <CheckCircle className="h-3 w-3 text-cyan-500" />
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "gap-1 font-mono",
                                                        user.risk_level === 'Low' && "text-green-600 border-green-200 bg-green-50",
                                                        user.risk_level === 'Medium' && "text-amber-600 border-amber-200 bg-amber-50",
                                                        user.risk_level === 'High' && "text-orange-600 border-orange-200 bg-orange-50",
                                                        user.risk_level === 'Critical' && "text-red-600 border-red-200 bg-red-50"
                                                    )}
                                                >
                                                    <Siren className="h-3 w-3" />
                                                    {user.risk_score}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.is_admin ? (
                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Admin</Badge>
                                                ) : (
                                                    <Badge variant="outline">User</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.is_banned ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                        <ShieldAlert className="h-3 w-3" /> Banned
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex w-fit items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" /> Active
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.is_admin || user.subscription_status === 'active' || user.subscription_status === 'trialing' ? (
                                                    <Badge className={cn(
                                                        "flex w-fit items-center gap-1",
                                                        user.is_admin ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-amber-100 text-amber-700 border-amber-200"
                                                    )}>
                                                        <Crown className="h-3 w-3" /> {user.is_admin ? "PRO (Admin)" : "Pro"}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground uppercase text-xs font-semibold">Free</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs text-muted-foreground">
                                                    <span>{user.total_notes} Notes</span>
                                                    <span>{user.total_sets} Sets</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {user.last_sign_in_at
                                                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                                                    : <span className="text-xs italic opacity-50">Never</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUser(user)}
                                                >
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card className={cn(
                        "relative overflow-hidden border-none shadow-xl transition-all duration-500",
                        activeDefense
                            ? "bg-gradient-to-br from-green-600/90 to-emerald-900/90 text-white"
                            : "bg-gradient-to-br from-slate-800 to-slate-950 text-white"
                    )}>
                        {/* Cyber Background Accents */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Shield className="h-64 w-64 rotate-12" />
                        </div>

                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 relative z-10">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                    <div className="relative">
                                        <ShieldCheck className={cn("h-8 w-8", activeDefense ? "text-white" : "text-emerald-400")} />
                                        {activeDefense && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    Neural Sentinel Core
                                </CardTitle>
                                <CardDescription className={cn("text-sm", activeDefense ? "text-white/80" : "text-slate-400")}>
                                    Managing autonomous threat detection and enforcement protocols.
                                </CardDescription>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className={cn(
                                    "flex items-center gap-3 px-4 py-2 rounded-full border backdrop-blur-md transition-all",
                                    activeDefense
                                        ? "bg-white/20 border-white/30"
                                        : "bg-slate-900/50 border-slate-700"
                                )}>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Enforcement Mode</span>
                                        <span className="text-xs font-bold">{activeDefense ? "ACTIVE DEFENSE" : "MONITORING ONLY"}</span>
                                    </div>
                                    <Switch
                                        id="active-defense"
                                        checked={activeDefense}
                                        onCheckedChange={handleToggleActiveDefense}
                                        className="data-[state=checked]:bg-white data-[state=unchecked]:bg-slate-700"
                                    />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={cn(
                                        "bg-black/20 border-white/10 text-[9px] uppercase tracking-tighter",
                                        activeDefense ? "text-emerald-300" : "text-slate-400"
                                    )}>
                                        <Activity className="h-2 w-2 mr-1 animate-pulse" />
                                        Autonomous Protection: 4HR Cycle
                                    </Badge>
                                    {lastSweep && (
                                        <span className="text-[9px] opacity-40 font-mono">
                                            LAST SWEEP: {new Date(lastSweep).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="flex items-center justify-between mt-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1 bg-cyan-500 rounded-full animate-pulse" />
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Threat Intelligence Feed</h2>
                                <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                                    <Activity className="h-3 w-3 text-cyan-500 animate-pulse" />
                                    Live system analysis operational.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleRunScan}
                            disabled={scanLoading}
                            variant={activeDefense ? "default" : "secondary"}
                            className={cn(
                                "gap-2 h-11 px-6 shadow-lg transition-all active:scale-95",
                                activeDefense && "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            {scanLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                            {scanLoading ? "System Scanning..." : activeDefense ? "Initialize Enforcement Scan" : "Execute Diagnostic Scan"}
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-cyan-500 bg-cyan-500/5 overflow-hidden relative">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-cyan-700">Real-time Alerts</CardTitle>
                                <Siren className="h-4 w-4 text-cyan-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-cyan-900">{alerts.length}</div>
                                <p className="text-[10px] text-cyan-600/80 font-medium">PENDING ANALYSIS</p>
                            </CardContent>
                            <div className="absolute -bottom-2 -right-2 opacity-10">
                                <Activity className="h-16 w-16" />
                            </div>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-700">Protected Nodes</CardTitle>
                                <Shield className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-emerald-900">{users.length}</div>
                                <p className="text-[10px] text-emerald-600/80 font-medium">TOTAL USER BASE</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-700">Anomalies</CardTitle>
                                <Zap className="h-4 w-4 text-amber-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-amber-900">
                                    {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length}
                                </div>
                                <p className="text-[10px] text-amber-600/80 font-medium">HIGH RISK EVENTS</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500 bg-purple-500/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-purple-700">Neutralized</CardTitle>
                                <Lock className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-purple-900">
                                    {alerts.filter(a => a.action_taken === 'banned').length}
                                </div>
                                <p className="text-[10px] text-purple-600/80 font-medium">AUTO-ENFORCED BANS</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Action Taken</TableHead>
                                    <TableHead>Alert Type</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Detected At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {alerts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No active security alerts. System is healthy.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    alerts.map((alert) => (
                                        <TableRow key={alert.id} className="group hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <Badge
                                                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                                                    className={cn(
                                                        "uppercase text-[10px] px-2 py-0.5 font-bold tracking-wider",
                                                        alert.severity === 'high' && "bg-orange-100 text-orange-700 hover:bg-orange-100",
                                                        alert.severity === 'medium' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                                        alert.severity === 'low' && "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                                    )}
                                                >
                                                    {alert.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {alert.action_taken === 'banned' ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1.5 bg-red-600 shadow-sm">
                                                        <Lock className="h-3 w-3" /> NEUTRALIZED
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1.5 opacity-60">
                                                        <Activity className="h-3 w-3" /> MONITORED
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-700">
                                                {alert.type.replace(/_/g, ' ').toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Fingerprint className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-mono text-[11px] text-muted-foreground bg-muted p-1 rounded">
                                                        {alert.user_id.split('-')[0]}...
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]">
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(alert.details).map(([key, value]) => (
                                                        <Badge key={key} variant="outline" className="text-[9px] bg-slate-50 border-slate-200">
                                                            {key}: {String(value)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                {new Date(alert.created_at).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs >

            {/* User Management Sheet */}
            < Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-md w-full">
                    {selectedUser && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={selectedUser.avatar_url || undefined} />
                                        <AvatarFallback className="text-xl">{selectedUser.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <SheetTitle className="flex items-center gap-2">
                                            {selectedUser.display_name || 'Unnamed User'}
                                            {selectedUser.email_confirmed_at && <CheckCircle className="h-4 w-4 text-cyan-500" />}
                                        </SheetTitle>
                                        <SheetDescription>{selectedUser.email}</SheetDescription>
                                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                                            <span>Active: {selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString() : 'Never'}</span>
                                            <span>•</span>
                                            <span>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {selectedUser.is_admin && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Admin</Badge>}
                                            {['active', 'trialing'].includes(selectedUser.subscription_status) && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pro Member</Badge>}
                                            {selectedUser.is_exempt && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 flex gap-1 items-center"><ShieldCheck className="h-3 w-3" /> Immunity</Badge>}
                                            <Badge className={cn(
                                                "gap-1",
                                                selectedUser.risk_level === 'Low' && "bg-green-100 text-green-700",
                                                selectedUser.risk_level === 'Medium' && "bg-amber-100 text-amber-700",
                                                selectedUser.risk_level === 'High' && "bg-orange-100 text-orange-700",
                                                selectedUser.risk_level === 'Critical' && "bg-red-100 text-red-700"
                                            )}>
                                                Risk: {selectedUser.risk_level} ({selectedUser.risk_score})
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Actions */}
                                <div className="space-y-4">
                                    {/* Usage Stats Content */}
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="p-3 bg-muted/20 rounded-lg border">
                                            <div className="text-2xl font-bold">{selectedUser.total_notes}</div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase">Notes</div>
                                        </div>
                                        <div className="p-3 bg-muted/20 rounded-lg border">
                                            <div className="text-2xl font-bold">{selectedUser.total_sets}</div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase">Study Sets</div>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account Actions</h3>

                                    <div className="grid gap-2">
                                        <Button
                                            variant="outline"
                                            className="justify-start gap-2 h-auto py-3"
                                            onClick={() => handleResetPassword(selectedUser.email)}
                                        >
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-semibold">Reset Password</span>
                                                <span className="text-xs text-muted-foreground">Send recovery email</span>
                                            </div>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="justify-start gap-2 h-auto py-3"
                                            onClick={() => handleMagicLink(selectedUser.email)}
                                        >
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-semibold">Send Magic Link</span>
                                                <span className="text-xs text-muted-foreground">Passwordless login via email</span>
                                            </div>
                                        </Button>

                                        {!selectedUser.is_admin && (
                                            <Button
                                                variant={selectedUser.is_exempt ? "secondary" : "outline"}
                                                className={cn("justify-start gap-2 h-auto py-3", selectedUser.is_exempt ? "bg-blue-50 border-blue-200 text-blue-700" : "")}
                                                onClick={() => handleToggleImmunity(selectedUser.id, selectedUser.is_exempt)}
                                            >
                                                <ShieldCheck className={cn("h-4 w-4", selectedUser.is_exempt ? "text-blue-700" : "text-muted-foreground")} />
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="font-semibold">{selectedUser.is_exempt ? "Revoke Immunity" : "Grant Diplomatic Immunity"}</span>
                                                    <span className={cn("text-xs", selectedUser.is_exempt ? "text-blue-600/80" : "text-muted-foreground")}>
                                                        {selectedUser.is_exempt ? "User is currently whitelisted" : "Whitelist from automated bans"}
                                                    </span>
                                                </div>
                                            </Button>
                                        )}



                                        {selectedUser.is_admin ? (
                                            <div className="space-y-4">
                                                <div className="p-4 border border-purple-200 rounded-lg bg-purple-50 space-y-2">
                                                    <div className="flex items-center gap-2 text-purple-700">
                                                        <ShieldAlert className="h-5 w-5" />
                                                        <h3 className="font-bold">Super Admin Access</h3>
                                                    </div>
                                                    <p className="text-sm text-purple-600/90 leading-relaxed text-left">
                                                        This account has <strong>Full Administrative Privileges</strong>, implicit <strong>Pro Access</strong>, and <strong>Permanent Diplomatic Immunity</strong>.
                                                        <br /><br />
                                                        <span className="font-bold text-purple-800">Safety Locks Engaged:</span> Admin accounts cannot be banned, deleted, or targeted by automated security scans.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3 p-3 border rounded-md bg-amber-50/50 border-amber-100">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Premium Access</label>
                                                            {['active', 'trialing'].includes(selectedUser.subscription_status) ? (
                                                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                                                                    Pro Member {selectedUser.subscription_status === 'trialing' && '(Trial)'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                                    Free Tier
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Subscription Details Display */}
                                                        {['active', 'trialing'].includes(selectedUser.subscription_status) && (
                                                            <div className="text-xs text-muted-foreground mt-2 mb-2 p-2 bg-white/50 rounded border border-amber-100">
                                                                {selectedUser.current_period_end && (
                                                                    <div className="flex justify-between items-center py-1">
                                                                        <span>Expires:</span>
                                                                        <span className="font-medium text-amber-900">
                                                                            {new Date(selectedUser.current_period_end).toLocaleDateString(undefined, {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {selectedUser.granted_by_email && (
                                                                    <div className="pt-2 mt-2 border-t border-amber-200/50">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="font-semibold text-amber-800">
                                                                                Granted by Admin {selectedUser.granted_duration && `(${selectedUser.granted_duration})`}:
                                                                            </span>
                                                                            <span className="font-medium text-amber-900 truncate">{selectedUser.granted_by_email}</span>
                                                                            {selectedUser.granted_at && (
                                                                                <span className="text-[10px] text-amber-600">
                                                                                    {new Date(selectedUser.granted_at).toLocaleDateString()} at {new Date(selectedUser.granted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2 pt-2 flex-col">
                                                            <div className="flex gap-2 w-full">
                                                                <Select value={premiumDuration} onValueChange={setPremiumDuration}>
                                                                    <SelectTrigger className="w-[140px] bg-white border-amber-200 text-amber-900 focus:ring-amber-500">
                                                                        <SelectValue placeholder="Duration" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="24 hours">24 Hours</SelectItem>
                                                                        <SelectItem value="2 weeks">2 Weeks</SelectItem>
                                                                        <SelectItem value="1 month">1 Month</SelectItem>
                                                                        <SelectItem value="3 months">3 Months</SelectItem>
                                                                        <SelectItem value="6 months">6 Months</SelectItem>
                                                                        <SelectItem value="1 year">1 Year</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                <Button
                                                                    variant="outline"
                                                                    className="flex-1 justify-start gap-2 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300 border-amber-200 text-amber-700 bg-amber-50"
                                                                    onClick={() => handleGrantPremium(selectedUser.id)}
                                                                >
                                                                    <Crown className="h-4 w-4" />
                                                                    <span className="font-semibold">
                                                                        {['active', 'trialing'].includes(selectedUser.subscription_status) ? "Update/Extend" : "Grant Premium"}
                                                                    </span>
                                                                </Button>
                                                            </div>

                                                            {['active', 'trialing'].includes(selectedUser.subscription_status) && (
                                                                <Button
                                                                    variant="destructive"
                                                                    className="w-full justify-start gap-2 mt-1"
                                                                    onClick={() => handleRevokePremium(selectedUser.id)}
                                                                >
                                                                    <ShieldOff className="h-4 w-4" />
                                                                    <span className="font-semibold">Revoke Premium Access</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-amber-600/80">
                                                        Updates the user's subscription to end after the selected duration from now.
                                                    </p>
                                                </div>

                                                {/* Danger Zone */}
                                                <div className="space-y-4 border border-red-200 rounded-lg p-4 bg-red-50/10">
                                                    <div className="flex items-center gap-2 text-red-600">
                                                        <AlertTriangle className="h-5 w-5" />
                                                        <h3 className="font-bold">Danger Zone</h3>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Be careful with these actions.
                                                    </p>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
                                                            <div>
                                                                <p className="font-medium text-sm">Remove MFA Factors</p>
                                                                <p className="text-xs text-muted-foreground">Disables 2FA for this user</p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRemoveMFA(selectedUser.id)}
                                                                disabled={actionLoading === selectedUser.id}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <ShieldOff className="h-4 w-4 mr-2" />
                                                                Remove
                                                            </Button>
                                                        </div>

                                                        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
                                                            <div>
                                                                <p className="font-medium text-sm">Ban User</p>
                                                                <p className="text-xs text-muted-foreground">Revoke access temporarily</p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleBanUser(selectedUser.id, selectedUser.is_banned)}
                                                                disabled={actionLoading === selectedUser.id}
                                                                className={selectedUser.is_banned ? "text-green-600" : "text-red-600 hover:bg-red-50"}
                                                            >
                                                                {selectedUser.is_banned ? (
                                                                    <>
                                                                        <UserCheck className="h-4 w-4 mr-2" />
                                                                        Unban
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserX className="h-4 w-4 mr-2" />
                                                                        Ban
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>

                                                        <div className="flex items-center justify-between p-3 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/10">
                                                            <div>
                                                                <p className="font-medium text-sm text-red-600">Delete User</p>
                                                                <p className="text-xs text-red-600/80">Permanently delete account</p>
                                                            </div>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDeleteUser(selectedUser.id)}
                                                                disabled={actionLoading === selectedUser.id}
                                                            >
                                                                <Trash className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet >

            {/* Premium Confirmation Dialog */}
            < AlertDialog open={confirmConfig.open} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="glass-card rounded-[2rem] border-primary/20 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter">
                            {confirmConfig.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-foreground font-medium pt-2 leading-relaxed">
                            {confirmConfig.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-6">
                        <AlertDialogCancel className="rounded-xl px-6 font-bold border-border/60">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmConfig.onConfirm}
                            className={cn(
                                "rounded-xl px-8 font-black shadow-premium active:scale-95 transition-all",
                                confirmConfig.variant === 'destructive' ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            Confirm Action
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </div >
    );
};
