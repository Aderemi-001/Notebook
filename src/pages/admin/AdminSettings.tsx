import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const AdminSettings = () => {
    const [security, setSecurity] = useState({ rls_enabled: false, escalation_protection: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSecurity = async () => {
            try {
                const { data } = await supabase.rpc('admin_get_security_status' as any);
                if (data) {
                    setSecurity(data as any);
                }
            } catch (e) {
                console.error('Security check failed', e);
            } finally {
                setLoading(false);
            }
        };
        checkSecurity();
    }, []);

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Configure global platform behavior and security.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-green-100 dark:border-green-900/20">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            <CardTitle>Security Status</CardTitle>
                        </div>
                        <CardDescription>
                            Active security protocols and monitoring.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                                    <Lock className="h-4 w-4 text-green-700 dark:text-green-300" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-900 dark:text-green-100">Privilege Escalation Protection</p>
                                    <p className="text-sm text-green-700 dark:text-green-300/80">
                                        Database triggers preventing unauthorized admin promotion.
                                    </p>
                                </div>
                            </div>
                            <Badge variant={security.escalation_protection ? 'default' : 'destructive'} className={security.escalation_protection ? "bg-green-600" : ""}>
                                {loading ? '...' : security.escalation_protection ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <Server className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                </div>
                                <div>
                                    <p className="font-semibold">Row Level Security (RLS)</p>
                                    <p className="text-sm text-muted-foreground">
                                        Strict policies enforced on user data tables.
                                    </p>
                                </div>
                            </div>
                            <Badge variant={security.rls_enabled ? 'outline' : 'destructive'} className={security.rls_enabled ? "border-green-500 text-green-600" : ""}>
                                {loading ? '...' : security.rls_enabled ? 'ENFORCED' : 'DISABLED'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
