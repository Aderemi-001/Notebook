import { useEffect, useState, useRef } from 'react';
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
    Shield,
    Fingerprint,
    Bot,
    Terminal,
    CheckCircle as CheckCircleIcon,
    Loader2,
    Siren,
    Zap,
    ShieldCheck as ShieldCheckIcon,
    Lock as LockIcon,
    Search as SearchIcon,
    ShieldAlert as ShieldAlertIcon,
    Activity as ActivityIcon,
    Mail,
    Key,
    ShieldOff,
    Trash,
    AlertTriangle,
    Crown,
    UserX,
    UserCheck,
    Copy,
    Eye,
    RefreshCcw
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

    const [inspectedUser, setInspectedUser] = useState<AdminUser | null>(null);
    const [inspectedAlert, setInspectedAlert] = useState<AdminAlert | null>(null);

    // Terminal Security State
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
    const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

    // Terminal State
    const [isTerminalAuthenticated, setIsTerminalAuthenticated] = useState(false);
    const [terminalHistory, setTerminalHistory] = useState<{ type: 'system' | 'user' | 'bot', text: string, timestamp: Date }[]>([
        { type: 'system', text: '   _____ ______ _   _ _______ _____ _   _ ______ _      ', timestamp: new Date() },
        { type: 'system', text: '  / ____|  ____| \ | |__   __|_   _| \ | |  ____| |     ', timestamp: new Date() },
        { type: 'system', text: ' | (___ | |__  |  \| |  | |    | | |  \| | |__  | |     ', timestamp: new Date() },
        { type: 'system', text: '  \___ \|  __| | . ` |  | |    | | | . ` |  __| | |     ', timestamp: new Date() },
        { type: 'system', text: '  ____) | |____| |\  |  | |   _| |_| |\  | |____| |____ ', timestamp: new Date() },
        { type: 'system', text: ' |_____/|______|_| \_|  |_|  |_____|_| \_|______|______|', timestamp: new Date() },
        { type: 'system', text: 'SENTINEL OS v5.0.4 | KERNEL: NEURAL-X86 | UPTIME: 99.99%', timestamp: new Date() },
        { type: 'bot', text: 'ACCESS RESTRICTED. ENTER AUTHORIZATION CODE:', timestamp: new Date() },
    ]);
    const [terminalInput, setTerminalInput] = useState('');
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const handleTerminalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!terminalInput.trim()) return;

        const cmd = terminalInput.trim();
        const parts = cmd.split(' ');
        const normalized = parts[0].toLowerCase();
        const args = parts.slice(1);

        // If not authenticated, only allow password entry
        if (!isTerminalAuthenticated) {
            // Check for persistent lockout state - only show warning but allow attempt for bypass
            if (lockoutUntil && lockoutUntil > new Date() && cmd.length < 20) {
                const remaining = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 1000);
                setTerminalHistory(prev => [...prev,
                { type: 'user', text: '********', timestamp: new Date() },
                { type: 'bot', text: `SECURITY LOCKOUT ACTIVE. RETRY IN ${remaining}s OR USE MASTER BYPASS.`, timestamp: new Date() }
                ]);
                setTerminalInput('');
                return;
            }

            setTerminalHistory(prev => [...prev, { type: 'user', text: '********', timestamp: new Date() }]);
            setTerminalInput('');

            setTimeout(async () => {
                try {
                    const { data, error } = await supabase.rpc('verify_admin_terminal_code', {
                        provided_code: cmd
                    });

                    const res = data as { valid: boolean; error?: string; message?: string; attempts?: number };

                    if (res?.valid && !error) {
                        setIsTerminalAuthenticated(true);
                        setFailedAttempts(0);
                        setLockoutUntil(null);
                        localStorage.removeItem('sentinel_lockout_until');
                        setTerminalHistory(prev => [
                            ...prev,
                            { type: 'bot', text: 'ACCESS GRANTED. NEURAL INTERFACE ACTIVE.', timestamp: new Date() },
                            { type: 'system', text: 'WELCOME, SUPER_ADMIN. SENTINEL_CORE ONLINE.', timestamp: new Date() }
                        ]);
                    } else {
                        const newFailedAttempts = res?.attempts || (failedAttempts + 1);
                        setFailedAttempts(newFailedAttempts);

                        if (res?.error === 'RATE_LIMIT_EXCEEDED' || newFailedAttempts >= 3) {
                            const lockoutDuration = 60000; // 1 minute frontend timer, but backend checks 15 mins
                            const lockoutTime = new Date(Date.now() + lockoutDuration);
                            setLockoutUntil(lockoutTime);
                            localStorage.setItem('sentinel_lockout_until', lockoutTime.toISOString());
                            setTerminalHistory(prev => [...prev, { type: 'bot', text: res?.message || 'CRITICAL AUTH FAILURE. SYSTEM LOCKOUT INITIATED.', timestamp: new Date() }]);
                        } else {
                            setTerminalHistory(prev => [...prev, { type: 'bot', text: `INVALID ACCESS CODE. ATTEMPT ${newFailedAttempts}/3. RETRY:`, timestamp: new Date() }]);
                        }
                    }
                } catch (err) {
                    setTerminalHistory(prev => [...prev, { type: 'bot', text: "CONNECTION ERROR. SECURITY HANDSHAKE FAILED.", timestamp: new Date() }]);
                }
            }, 600);
            return;
        }

        setTerminalHistory(prev => [...prev, { type: 'user', text: cmd, timestamp: new Date() }]);
        setTerminalInput('');

        // Process command
        setTimeout(async () => {
            // Log command to backend audit log
            try {
                await supabase.rpc('log_terminal_command', {
                    terminal_command: normalized,
                    command_args: args
                });
            } catch (err) {
                console.error('Audit logging failed:', err);
            }

            let responses: { type: 'system' | 'user' | 'bot', text: string }[] = [];

            const addBot = (text: string) => responses.push({ type: 'bot', text });

            if (normalized === 'help') {
                addBot("--- SENTINEL COMMAND SUITE v5.0 ---");
                addBot("USER: [users] [find <q>] [inspect <id>] [unban <id>] [immunity <id>] [premium <id>] [msg <id> <text>] [purge]");
                addBot("THREAT: [alerts] [view <id>] [resolve <id>] [shred <id>] [logs]");
                addBot("SYSTEM: [status] [scan] [system] [broadcast <msg>] [diag] [logout] [clear]");
            } else if (normalized === 'status') {
                addBot(`CORE: STABLE | DEFENSE: ${activeDefense ? 'ACTIVE' : 'MONITOR'} | NODES: ${users.length} | ANOMALIES: ${alerts.filter(a => !a.resolved).length}`);
            } else if (normalized === 'users') {
                const banned = users.filter(u => u.is_banned).length;
                const admins = users.filter(u => u.is_admin).length;
                addBot(`NODE SUMMARY: TOTAL=${users.length} | BANNED=${banned} | ADMINS=${admins} | PROTECTED=${users.length - banned}`);
            } else if (normalized === 'find') {
                const query = args.join(' ').toLowerCase();
                if (!query) {
                    addBot("ERROR: SPECIFY SEARCH_QUERY.");
                } else {
                    const matches = users.filter(u =>
                        u.display_name?.toLowerCase().includes(query) ||
                        u.email.toLowerCase().includes(query) ||
                        u.id.includes(query)
                    ).slice(0, 5);

                    if (matches.length === 0) {
                        addBot("NO NODES MATCHING CRITERIA.");
                    } else {
                        addBot(`MATCHES FOUND: ${matches.length}`);
                        matches.forEach(m => addBot(`> ${m.display_name || 'UNNAMED'} | ID: ${m.id.substring(0, 8)}... | ${m.email}`));
                    }
                }
            } else if (normalized === 'msg') {
                const targetId = args[0];
                const text = args.slice(1).join(' ');
                if (targetId && text) {
                    const user = users.find(u => u.id.startsWith(targetId) || u.id === targetId);
                    if (user) {
                        addBot(`DISPATCHING DIRECT ENCRYPTED SIGNAL TO NODE: ${user.display_name || user.id.substring(0, 8)}...`);
                        try {
                            const { error } = await supabase.rpc('admin_send_direct_message', {
                                p_user_ids: [user.id],
                                p_message: `${text}\n\n- Sent via Sentinel Terminal 🛡️`,
                                p_type: 'alert',
                                p_title: 'SYSTEM_PRIORITY_SIGNAL'
                            });
                            if (error) throw error;
                            addBot("SIGNAL ACCOMPLISHED. TARGET NOTIFIED.");
                        } catch (err: any) {
                            addBot(`SIGNAL INTERRUPTED: ${err.message}`);
                        }
                    } else {
                        addBot("ERROR: TARGET_NODE_ID NOT FOUND.");
                    }
                } else {
                    addBot("ERROR: USAGE: msg <node_id> <message_text>");
                }
            } else if (normalized === 'inspect') {
                const targetId = args[0];
                const user = users.find(u => u.id.startsWith(targetId) || u.id === targetId);
                if (user) {
                    addBot(`SYNCHRONIZING WITH NODE: ${user.display_name || user.id}`);
                    setInspectedUser(user);
                } else {
                    addBot("ERROR: NODE_ID NOT FOUND.");
                }
            } else if (normalized === 'view') {
                const targetId = args[0];
                const alert = alerts.find(a => a.id.startsWith(targetId) || a.id === targetId);
                if (alert) {
                    addBot(`EXTRACTING ANOMALY DATA: ${alert.type}`);
                    setInspectedAlert(alert);
                } else {
                    addBot("ERROR: ANOMALY_ID NOT FOUND.");
                }
            } else if (normalized === 'resolve') {
                const targetId = args[0];
                const alert = alerts.find(a => a.id.startsWith(targetId) || a.id === targetId);
                if (alert) {
                    addBot(`TREATING ANOMALY: ${targetId}...`);
                    handleResolveAlert(alert.id);
                } else {
                    addBot("ERROR: ANOMALY_ID NOT FOUND.");
                }
            } else if (normalized === 'shred') {
                const targetId = args[0];
                const alert = alerts.find(a => a.id.startsWith(targetId) || a.id === targetId);
                if (alert) {
                    addBot(`PURGING LOG ENTRY: ${targetId}...`);
                    handleDeleteAlert(alert.id);
                } else {
                    addBot("ERROR: ANOMALY_ID NOT FOUND.");
                }
            } else if (normalized === 'overdrive') {
                const mode = args[0];
                if (mode === 'on' || mode === 'active') {
                    setActiveDefense(true);
                    addBot("OVERDRIVE ENGAGED. AUTONOMOUS ENFORCEMENT ACTIVE.");
                } else if (mode === 'off' || mode === 'passive') {
                    setActiveDefense(false);
                    addBot("OVERDRIVE DISENGAGED. MONITORING MODE ONLY.");
                } else {
                    addBot(`OVERDRIVE IS CURRENTLY ${activeDefense ? 'ACTIVE' : 'PASSIVE'}. USE [overdrive on|off] TO TOGGLE.`);
                }
            } else if (normalized === 'logs') {
                addBot("RETRIEVING ENFORCEMENT LOGS...");
                const recentAlerts = alerts.slice(0, 5);
                if (recentAlerts.length === 0) {
                    addBot("NO RECENT LOG ENTRY DATA.");
                } else {
                    recentAlerts.forEach(a => {
                        const status = a.resolved ? "TREATED" : a.action_taken === 'banned' ? "NEUTRALIZED" : "PENDING";
                        addBot(`[${new Date(a.created_at).toLocaleTimeString([], { hour12: false })}] ${a.id.substring(0, 6)}: ${a.type} | ${status}`);
                    });
                }
            } else if (normalized === 'purge') {
                const highRisk = users.filter(u => u.risk_level === 'High' && !u.is_admin && !u.is_banned);
                if (highRisk.length === 0) {
                    addBot("NO HIGH-RISK TARGETS IDENTIFIED FOR PURGE.");
                } else {
                    addBot(`IDENTIFIED ${highRisk.length} HIGH-RISK NODES.`);
                    addBot("EXECUTING MASS NEUTRALIZATION...");
                    highRisk.forEach(u => handleBanUser(u.id, false));
                    addBot("PURGE SEQUENCE COMPLETE.");
                }
            } else if (normalized === 'scan') {
                addBot("INITIALIZING FULL SPECTRUM ENFORCEMENT SCAN...");
                handleRunScan();
            } else if (normalized === 'whoami') {
                const { data } = await supabase.auth.getUser();
                addBot(`UID: ${data.user?.id || 'ANONYMOUS'} | ADM_LVL: 5 | MODE: SUPER_ADMIN`);
            } else if (normalized === 'system') {
                addBot("   _____ ______ _   _ _______ _____ _   _ ______ _      ");
                addBot("  / ____|  ____| \\ | |__   __|_   _| \\ | |  ____| |     ");
                addBot(" | (___ | |__  |  \\| |  | |    | | |  \\| | |__  | |     ");
                addBot("  \\___ \\|  __| | . ` |  | |    | | | . ` |  __| | |     ");
                addBot("  ____) | |____| |\\  |  | |   _| |_| |\\  | |____| |____ ");
                addBot(" |_____/|______|_| \\_|  |_|  |_____|_| \\_|______|______|");
                addBot("v5.0.4 | UPTIME: 99.98% | CORE_TEMP: OPTIMAL | DEFENSE: ACTIVE");
            } else if (normalized === 'broadcast') {
                const msg = args.join(' ');
                if (msg) {
                    addBot("PUSHING GLOBAL BROADCAST PROTOCOL...");
                    try {
                        // 1. Update system settings (Banner)
                        await supabase
                            .from('system_settings')
                            .upsert({
                                key: 'global_broadcast',
                                value: {
                                    message: msg,
                                    active: true,
                                    type: 'info',
                                    isPopup: false,
                                    expiresAt: null
                                },
                                updated_at: new Date().toISOString()
                            });

                        // 2. Send Real-time Notification
                        try {
                            await (supabase.rpc as any)('admin_send_global_notification', {
                                p_title: 'SYSTEM_BROADCAST',
                                p_message: msg,
                                p_type: 'info'
                            });
                        } catch (rpcErr) {
                            console.warn("Real-time RPC not available, banner updated.");
                        }

                        addBot(`LOG: "${msg.substring(0, 40)}${msg.length > 40 ? '...' : ''}"`);
                        addBot("GLOBAL SYNCHRONIZATION COMPLETE.");
                        showSuccess(`Global Broadcast Dispatched: ${msg}`);
                    } catch (err: any) {
                        addBot(`PROTOCOL ERROR: ${err.message}`);
                    }
                } else {
                    addBot("ERROR: SPECIFY MESSAGE.");
                }
            } else if (normalized === 'diag') {
                addBot("RUNNING SPECTRAL CORE DIAGNOSTIC...");
                addBot("[████████████████████] 100% | STATUS: NOMINAL");
                addBot("ALL SUBSYSTEMS OPERATIONAL.");
            } else if (normalized === 'logout') {
                setIsTerminalAuthenticated(false);
                setTerminalHistory(prev => [
                    ...prev,
                    { type: 'bot', text: 'SESSION TERMINATED.', timestamp: new Date() },
                    { type: 'bot', text: 'ENTER ACCESS CODE:', timestamp: new Date() }
                ]);
                return;
            } else if (normalized === 'clear') {
                setTerminalHistory([]);
                return;
            } else if (normalized === 'alerts') {
                const pending = alerts.filter(a => !a.resolved);
                if (pending.length === 0) {
                    addBot("NO ACTIVE ANOMALIES DETECTED.");
                } else {
                    addBot(`DETECTED ${pending.length} UNTREATED ANOMALIES.`);
                    pending.slice(0, 3).forEach(a => addBot(`> [${a.severity}] ${a.id.substring(0, 8)}... | ${a.type}`));
                }
            } else if (normalized.startsWith('ban')) {
                const targetId = args[0];
                if (targetId) {
                    const user = users.find(u => u.id.startsWith(targetId) || u.id === targetId);
                    if (user) {
                        addBot(`NEUTRALIZING TARGET NODE: ${user.display_name || user.id}...`);
                        handleBanUser(user.id, false);
                    } else {
                        addBot("ERROR: NODE_ID NOT FOUND.");
                    }
                } else {
                    addBot("ERROR: SPECIFY NODE_ID.");
                }
            } else {
                addBot("UNIDENTIFIED COMMAND. TYPE 'HELP' FOR MANUAL.");
            }

            setTerminalHistory(prev => [
                ...prev,
                ...responses.map(r => ({ ...r, timestamp: new Date() }))
            ]);
        }, 600);
    };

    useEffect(() => {
        if (terminalEndRef.current) {
            const container = terminalEndRef.current.parentElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [terminalHistory]);

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
        // Sync lockout from localStorage
        const localLockout = localStorage.getItem('sentinel_lockout_until');
        if (localLockout && new Date(localLockout) > new Date()) {
            setLockoutUntil(new Date(localLockout));
        }

        const checkAdminStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setCurrentUserIsAdmin(profile.is_admin);
                }
            }
        };
        checkAdminStatus();
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

    const handleResolveAlert = async (alertId: string) => {
        try {
            const { error } = await supabase
                .from('security_alerts')
                .update({ resolved: true, action_taken: 'resolved' })
                .eq('id', alertId);

            if (error) throw error;
            showSuccess('Anomaly treated and resolved.');
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true, action_taken: 'resolved' } : a));
            if (inspectedAlert?.id === alertId) {
                setInspectedAlert({ ...inspectedAlert, resolved: true, action_taken: 'resolved' });
            }
        } catch (error: any) {
            showError(`Resolution failed: ${error.message}`);
        }
    };

    const handleDeleteAlert = async (alertId: string) => {
        try {
            const { error } = await supabase
                .from('security_alerts')
                .delete()
                .eq('id', alertId);

            if (error) throw error;
            showSuccess('Anomaly purged from system logs.');
            setAlerts(alerts.filter(a => a.id !== alertId));
            if (inspectedAlert?.id === alertId) {
                setInspectedAlert(null);
            }
        } catch (error: any) {
            showError(`Purge failed: ${error.message}`);
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
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or user ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    {currentUserIsAdmin && (
                        <TabsTrigger value="security" className="gap-2">
                            <Siren className="h-4 w-4" />
                            Security Operations
                            {alerts.filter(a => !a.resolved).length > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                    {alerts.filter(a => !a.resolved).length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    )}
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
                                                                <CheckCircleIcon className="h-3 w-3 text-cyan-500" />
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                                        <div className="flex items-center gap-1 mt-0.5 group/id">
                                                            <Fingerprint className="h-3 w-3 text-muted-foreground/50" />
                                                            <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[120px] select-all" title={user.id}>
                                                                {user.id}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 p-0 opacity-0 group-hover/id:opacity-100 transition-opacity"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(user.id);
                                                                    showSuccess('User ID copied!');
                                                                }}
                                                            >
                                                                <Copy className="h-3 w-3 text-muted-foreground" />
                                                            </Button>
                                                        </div>
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
                                                        <ShieldAlertIcon className="h-3 w-3" /> Banned
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex w-fit items-center gap-1">
                                                        <CheckCircleIcon className="h-3 w-3" /> Active
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
                                        <ShieldCheckIcon className={cn("h-8 w-8", activeDefense ? "text-white" : "text-emerald-400")} />
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
                                        <ActivityIcon className="h-2 w-2 mr-1 animate-pulse" />
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

                    <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-cyan-500 bg-cyan-500/5 overflow-hidden relative">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-cyan-700">Real-time Alerts</CardTitle>
                                <Siren className="h-4 w-4 text-cyan-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-cyan-900">{alerts.filter(a => !a.resolved).length}</div>
                                <p className="text-[10px] text-cyan-600/80 font-medium">PENDING ANALYSIS</p>
                            </CardContent>
                            <div className="absolute -bottom-2 -right-2 opacity-10">
                                <ActivityIcon className="h-16 w-16" />
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
                                    {alerts.filter(a => !a.resolved && (a.severity === 'high' || a.severity === 'critical')).length}
                                </div>
                                <p className="text-[10px] text-amber-600/80 font-medium">HIGH RISK EVENTS</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500 bg-purple-500/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-purple-700">Neutralized</CardTitle>
                                <LockIcon className="h-4 w-4 text-purple-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-purple-900">
                                    {alerts.filter(a => a.action_taken === 'banned').length}
                                </div>
                                <p className="text-[10px] text-purple-600/80 font-medium">AUTO-ENFORCED BANS</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center justify-between mt-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1 bg-cyan-500 rounded-full animate-pulse" />
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Threat Intelligence Feed</h2>
                                <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                                    <ActivityIcon className="h-3 w-3 text-cyan-500 animate-pulse" />
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

                    {/* Neural Command Console */}
                    <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden mt-8 mb-8 group hover:border-cyan-500/50 transition-colors">
                        <CardHeader className="bg-slate-950/50 border-b border-white/5 py-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-400">Neural Sentinel Terminal</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] bg-black/40 text-cyan-400 border-cyan-900">ENCRYPTION: AES-256-GCM</Badge>
                                <Badge variant="outline" className="text-[9px] bg-black/40 text-emerald-500 border-emerald-900">BYPASS_ACTIVE</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col h-[350px]">
                            {/* Terminal History */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[11px] custom-scrollbar bg-slate-950/20">
                                {terminalHistory.map((entry, i) => (
                                    <div key={i} className={cn(
                                        "flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300",
                                        entry.type === 'system' && "text-emerald-500/70",
                                        entry.type === 'user' && "text-slate-300",
                                        entry.type === 'bot' && "text-cyan-400 font-bold"
                                    )}>
                                        <span className="opacity-40 shrink-0 text-[9px] flex items-center">[{entry.timestamp.toLocaleTimeString([], { hour12: false })}]</span>
                                        <span className="shrink-0 opacity-70">{entry.type === 'user' ? 'root@sentinel:~$' : <div className="flex items-center gap-1"><Bot className="h-3 w-3" /> SENTINEL_CORE {'>'}</div>}</span>
                                        <span className="break-all">{entry.text}</span>
                                    </div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>

                            {/* Input area */}
                            <div className="p-3 bg-slate-950/50 border-t border-white/5">
                                <form onSubmit={handleTerminalSubmit} className="flex gap-3 items-center">
                                    <span className="text-emerald-500 font-mono text-sm animate-pulse">❯</span>
                                    <Input
                                        value={terminalInput}
                                        onChange={(e) => setTerminalInput(e.target.value)}
                                        placeholder="Enter system override command (Type 'help' for manual)..."
                                        className="bg-transparent border-none text-cyan-500 placeholder:text-slate-700 font-mono text-xs focus-visible:ring-0 p-0 h-auto shadow-none"
                                        autoComplete="off"
                                    />
                                    <div className="h-4 w-1 bg-cyan-500/50 animate-pulse ml-auto" />
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Alert Type</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Detected At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {alerts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                                                {alert.resolved ? (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm">
                                                        <CheckCircleIcon className="h-3 w-3" /> TREATED
                                                    </Badge>
                                                ) : alert.action_taken === 'banned' ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1.5 bg-red-600 shadow-sm">
                                                        <LockIcon className="h-3 w-3" /> NEUTRALIZED
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1.5 opacity-60">
                                                        <ActivityIcon className="h-3 w-3" /> PENDING
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-700">
                                                {alert.type.replace(/_/g, ' ').toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 group cursor-pointer"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(alert.user_id);
                                                        showSuccess('User ID copied to clipboard');
                                                    }}>
                                                    <Fingerprint className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    <span className="font-mono text-[11px] text-muted-foreground bg-muted p-1 rounded group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center gap-1">
                                                        {alert.user_id.split('-')[0]}...
                                                        <Copy className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => setInspectedAlert(alert)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {!alert.resolved && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => handleResolveAlert(alert.id)}
                                                        >
                                                            <CheckCircleIcon className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteAlert(alert.id)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                                            {selectedUser.email_confirmed_at && <CheckCircleIcon className="h-4 w-4 text-cyan-500" />}
                                        </SheetTitle>
                                        <SheetDescription className="flex flex-col gap-1">
                                            <span>{selectedUser.email}</span>
                                            <span className="flex items-center gap-1.5 text-[10px] font-mono opacity-80 bg-muted/50 px-2 py-0.5 rounded w-fit select-all cursor-pointer hover:bg-muted transition-colors"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedUser.id);
                                                    showSuccess('User ID copied!');
                                                }}>
                                                <Fingerprint className="h-3 w-3" />
                                                {selectedUser.id}
                                                <Copy className="h-2.5 w-2.5 ml-1 opacity-50" />
                                            </span>
                                        </SheetDescription>
                                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                                            <span>Active: {selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString() : 'Never'}</span>
                                            <span>•</span>
                                            <span>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {selectedUser.is_admin && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Admin</Badge>}
                                            {['active', 'trialing'].includes(selectedUser.subscription_status) && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pro Member</Badge>}
                                            {selectedUser.is_exempt && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 flex gap-1 items-center"><ShieldCheckIcon className="h-3 w-3" /> Immunity</Badge>}
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
                                                <ShieldCheckIcon className={cn("h-4 w-4", selectedUser.is_exempt ? "text-blue-700" : "text-muted-foreground")} />
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
                                                        <ShieldAlertIcon className="h-5 w-5" />
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

            {/* Terminal Inspection Sheets */}
            <Sheet open={!!inspectedUser} onOpenChange={(open) => !open && setInspectedUser(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-xl w-full">
                    {inspectedUser && (
                        <div className="space-y-8 py-4">
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-bold text-2xl border-2 border-cyan-200 dark:border-cyan-800">
                                        {inspectedUser.display_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                                            {inspectedUser.display_name || 'Unnamed Node'}
                                            {inspectedUser.is_admin && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Admin</Badge>}
                                        </SheetTitle>
                                        <SheetDescription className="text-muted-foreground font-mono text-xs">
                                            UUID: {inspectedUser.id}
                                        </SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-4 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Risk Score</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-3xl font-black",
                                            inspectedUser.risk_level === 'High' ? "text-red-600" : "text-emerald-600"
                                        )}>{inspectedUser.risk_score}</span>
                                        <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                                    </div>
                                </Card>
                                <Card className="p-4 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Membership</p>
                                    <Badge className={cn(
                                        "capitalize font-bold",
                                        ['active', 'trialing'].includes(inspectedUser.subscription_status) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                                    )}>
                                        {inspectedUser.subscription_status}
                                    </Badge>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <ActivityIcon className="h-4 w-4 text-cyan-500" />
                                    Security Metadata
                                </h4>
                                <div className="space-y-2 border rounded-xl p-4 bg-muted/30 font-mono text-xs">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Email:</span>
                                        <span className="font-bold">{inspectedUser.email}</span>
                                    </div>
                                    <div className="flex justify-between border-b py-2">
                                        <span className="text-muted-foreground">Immunity:</span>
                                        <span className={(inspectedUser.is_exempt || inspectedUser.is_admin) ? "text-blue-600 font-black" : "text-red-500"}>
                                            {inspectedUser.is_admin ? "ENABLED (ADMIN)" : (inspectedUser.is_exempt ? "ENABLED" : "DISABLED")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2">
                                        <span className="text-muted-foreground">Last Uplink:</span>
                                        <span>{inspectedUser.last_sign_in_at ? new Date(inspectedUser.last_sign_in_at).toLocaleString() : 'NEVER'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex flex-col gap-3">
                                <Button
                                    className="w-full h-11 font-bold gap-2"
                                    disabled={inspectedUser.is_admin}
                                    onClick={() => handleBanUser(inspectedUser.id, inspectedUser.is_banned)}
                                >
                                    <LockIcon className="h-4 w-4" />
                                    {inspectedUser.is_banned ? "Reactivate Node" : "Neutralize Node (Ban)"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 font-bold gap-2 border-primary/20 hover:bg-primary/5"
                                    onClick={() => {
                                        setSelectedUser(inspectedUser);
                                        setInspectedUser(null);
                                    }}
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Open Full Management Console
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <Sheet open={!!inspectedAlert} onOpenChange={(open) => !open && setInspectedAlert(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-xl w-full border-l-red-500/20">
                    {inspectedAlert && (
                        <div className="space-y-8 py-4">
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center text-3xl border-2",
                                        inspectedAlert.severity === 'critical' ? "bg-red-50 border-red-200 text-red-600" : "bg-amber-50 border-amber-200 text-amber-600"
                                    )}>
                                        <ShieldAlertIcon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={inspectedAlert.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[9px] font-black tracking-widest">
                                                {inspectedAlert.severity} LEVEL THREAT
                                            </Badge>
                                            {inspectedAlert.resolved && (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black tracking-widest">
                                                    RESOLVED
                                                </Badge>
                                            )}
                                        </div>
                                        <SheetTitle className="text-2xl font-black tracking-tight">
                                            {inspectedAlert.type.replace(/_/g, ' ').toUpperCase()}
                                        </SheetTitle>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 border border-slate-800 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Terminal className="h-24 w-24" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Technical Payload
                                    </h4>
                                    <pre className="font-mono text-xs overflow-x-auto custom-scrollbar leading-relaxed">
                                        {JSON.stringify(inspectedAlert.details, null, 2)}
                                    </pre>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-4 border rounded-xl bg-muted/30">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Detection Origin</p>
                                        <p className="text-sm font-medium">Automatic Sentinel Sweep v5.0.4</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            TS: {new Date(inspectedAlert.created_at).toISOString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex flex-col gap-3">
                                    {!inspectedAlert.resolved && (
                                        <Button
                                            className="w-full h-12 font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
                                            onClick={() => handleResolveAlert(inspectedAlert.id)}
                                        >
                                            <CheckCircleIcon className="h-5 w-5" />
                                            ACKNOWLEDGE & RESOLVE
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 font-black gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteAlert(inspectedAlert.id)}
                                    >
                                        <Trash className="h-5 w-5" />
                                        SHRED ANOMALY RECORD
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div >
    );
};
