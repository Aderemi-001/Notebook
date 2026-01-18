import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NovaAI } from '@/utils/NovaAI';
import {
    Megaphone,
    Construction,
    Save,
    Loader2,
    CalendarClock,
    Maximize2,
    Send,
    Bot,
    CheckCircle2,
    AlertTriangle,
    Info,
    History,
    Sparkles,
    Check,
    ChevronsUpDown,
    Search,
    X,
    Users
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface BroadcastSettings {
    message: string;
    active: boolean;
    type: 'info' | 'warning' | 'alert';
    isPopup: boolean;
    expiresAt: string | null;
}

interface MaintenanceSettings {
    active: boolean;
}

const PRESET_MESSAGES = [
    {
        label: "Maintenance Warning",
        message: "We will be performing scheduled maintenance in 1 hour. Service may be interrupted.",
        type: "warning" as const
    },
    {
        label: "Maintenance Completed",
        message: "Maintenance is complete. All systems are operational. Thank you for your patience.",
        type: "info" as const
    },
    {
        label: "New Feature Alert",
        message: "Exciting news! We've just launched new features. Check your dashboard for details.",
        type: "info" as const
    },
    {
        label: "Critical Bug Fix",
        message: "We've resolved the recent issue affecting note saving. Please refresh your page.",
        type: "alert" as const
    }
];

export const AdminBroadcasts = () => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("broadcasts");
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Broadcast State
    const [broadcast, setBroadcast] = useState<BroadcastSettings>({
        message: '',
        active: false,
        type: 'info',
        isPopup: false,
        expiresAt: null
    });
    const [maintenance, setMaintenance] = useState<MaintenanceSettings>({
        active: false
    });
    const [duration, setDuration] = useState<string>('never');

    // Direct Message State
    const [selectedUsers, setSelectedUsers] = useState<{ id: string, display_name: string | null }[]>([]);
    const [dmMessage, setDmMessage] = useState('');
    const [dmType, setDmType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
    const [dmIsBot, setDmIsBot] = useState(true);

    // User Search State
    const [openCombobox, setOpenCombobox] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userSearchResults, setUserSearchResults] = useState<{ id: string, display_name: string | null }[]>([]);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (userSearchQuery.length < 2) {
                setUserSearchResults([]);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, display_name')
                .ilike('display_name', `%${userSearchQuery}%`)
                .limit(5);

            if (!error && data) {
                setUserSearchResults(data);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .in('key', ['global_broadcast', 'maintenance_mode']);

            if (error) throw error;

            if (data) {
                const broadcastValue = data.find(d => d.key === 'global_broadcast')?.value;
                const maintenanceValue = data.find(d => d.key === 'maintenance_mode')?.value;

                if (broadcastValue && typeof broadcastValue === 'object' && !Array.isArray(broadcastValue)) {
                    const broadcastData = broadcastValue as any;
                    setBroadcast({
                        message: broadcastData.message || '',
                        active: broadcastData.active ?? false,
                        type: broadcastData.type || 'info',
                        isPopup: broadcastData.isPopup ?? false,
                        expiresAt: broadcastData.expiresAt || null
                    });
                }
                if (maintenanceValue && typeof maintenanceValue === 'object' && !Array.isArray(maintenanceValue) && 'active' in maintenanceValue) {
                    setMaintenance(maintenanceValue as unknown as MaintenanceSettings);
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('admin_get_logs');

            if (error) throw error;

            // Filter only communication-related logs
            const commLogs = Array.isArray(data) ? data.filter((log: any) =>
                log.action === 'GLOBAL_NOTIFICATION' || log.action === 'DIRECT_MESSAGE'
            ) : [];

            setHistory(commLogs);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const response = await NovaAI.generateAdminMessage(aiPrompt);

            // Auto-populate fields based on active tab
            if (activeTab === 'broadcasts') {
                setBroadcast(prev => ({
                    ...prev,
                    message: response.content,
                    type: response.suggestedType === 'success' ? 'info' : response.suggestedType as any
                }));
            } else {
                setDmMessage(response.content);
                setDmType(response.suggestedType);
            }
            showSuccess("AI drafted your message!");
            setAiPrompt('');
        } catch (error) {
            showError("Failed to generate content");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDurationChange = (val: string) => {
        setDuration(val);
        if (val === 'never') {
            setBroadcast(prev => ({ ...prev, expiresAt: null }));
            return;
        }

        const now = new Date();
        const hours = parseInt(val);
        now.setHours(now.getHours() + hours);
        setBroadcast(prev => ({ ...prev, expiresAt: now.toISOString() }));
    };

    const loadPreset = (preset: typeof PRESET_MESSAGES[0]) => {
        if (activeTab === 'broadcasts') {
            setBroadcast(prev => ({
                ...prev,
                message: preset.message,
                type: preset.type
            }));
        } else {
            setDmMessage(preset.message);
            // Map preset type to DM type if compatible, else default
            setDmType(preset.type === 'alert' ? 'alert' : preset.type === 'warning' ? 'warning' : 'info');
        }
        showSuccess("Preset loaded");
    };

    const saveBroadcast = async () => {
        setLoading(true);
        try {
            // Update system settings
            const { error: settingsError } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'global_broadcast',
                    value: broadcast as any,
                    updated_at: new Date().toISOString()
                });

            if (settingsError) throw settingsError;

            // If active, also send as a global notification to everyone via RPC
            if (broadcast.active) {
                // Note: admin_send_global_notification may not exist in DB, using try-catch as fallback
                try {
                    const { error: rpcError } = await (supabase.rpc as any)('admin_send_global_notification', {
                        p_title: 'System Announcement',
                        p_message: broadcast.message,
                        p_type: broadcast.type
                    });
                    if (rpcError) console.warn("Background notification failed, but settings saved.", rpcError);
                } catch (rpcException) {
                    console.warn("RPC function not available, but settings saved.", rpcException);
                }
            }

            showSuccess('Broadcast settings updated.');
        } catch (error: any) {
            showError(`Update failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const saveMaintenance = async (active: boolean) => {
        try {
            const newState = { active };
            setMaintenance(newState);

            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'maintenance_mode',
                    value: newState,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            showSuccess(`Maintenance mode ${active ? 'ENABLED' : 'DISABLED'}.`);
        } catch (error: any) {
            showError(`Update failed: ${error.message}`);
            setMaintenance({ active: !active }); // Revert on error
        }
    };

    const toggleUserSelection = (userId: string, userName: string | null) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === userId);
            if (isSelected) {
                return prev.filter(u => u.id !== userId);
            } else {
                return [...prev, { id: userId, display_name: userName }];
            }
        });
    };

    const sendDirectMessage = async () => {
        if (selectedUsers.length === 0 || !dmMessage) {
            showError("Please select recipients and provide a message.");
            return;
        }

        setLoading(true);
        try {
            const finalMessage = dmIsBot
                ? `${dmMessage}\n\n- Nova Bot 🤖`
                : dmMessage;

            const userIds = selectedUsers.map(u => u.id);

            const { error } = await supabase.rpc('admin_send_direct_message', {
                p_user_ids: userIds,
                p_message: finalMessage,
                p_type: dmType,
                p_title: dmIsBot ? 'Message from Nova' : 'Admin Notification'
            });

            if (error) throw error;

            showSuccess(`Message sent to ${userIds.length} user(s). logged to history.`);
            setDmMessage('');
            setSelectedUsers([]);
        } catch (error: any) {
            showError(`Failed to send: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Communications</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage global announcements, maintenance, and user alerts.
                    </p>
                </div>

                {/* Visual Bot Decoration */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full text-xs font-bold border border-indigo-500/20">
                    <Bot className="h-4 w-4" />
                    <span>Nova Command Initialized</span>
                </div>
            </div>

            {/* AI Composer - Global Tool */}
            <Card className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-200/50 mb-6">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-base">Nova AI Composer</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex bg-background rounded-md shadow-sm border focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Input
                            placeholder="Ask Nova to write a message (e.g., 'Apology for 1-hour downtime')..."
                            className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateAI}
                            disabled={isGenerating || !aiPrompt}
                            className="h-auto px-4 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-l-none"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto mb-8 p-1 bg-muted/50 rounded-xl gap-1">
                    <TabsTrigger value="broadcasts" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300 py-2">
                        <Megaphone className="h-4 w-4 mr-2" /> Global Broadcasts
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300 py-2">
                        <Send className="h-4 w-4 mr-2" /> Direct Messages
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-300 py-2">
                        <History className="h-4 w-4 mr-2" /> History
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB 1: GLOBAL BROADCASTS --- */}
                <TabsContent value="broadcasts" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid gap-6">
                        {/* Global Broadcast Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Megaphone className="h-5 w-5 text-indigo-600" />
                                        <CardTitle>Global Broadcast Banner</CardTitle>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                                                <History className="h-3.5 w-3.5" /> Presets
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="end" className="w-[200px] p-0">
                                            <div className="p-2 grid gap-1">
                                                {PRESET_MESSAGES.map((preset, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => loadPreset(preset)}
                                                        className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <CardDescription>
                                    Display a message at the top of the dashboard for all users.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="message">Announcement Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Type your announcement here..."
                                        value={broadcast.message}
                                        onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                    <p className="text-xs text-muted-foreground">Supports multi-line text.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Banner Type</Label>
                                        <RadioGroup
                                            value={broadcast.type}
                                            onValueChange={(val: any) => setBroadcast({ ...broadcast, type: val })}
                                            className="flex flex-col gap-2"
                                        >
                                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                                                <RadioGroupItem value="info" id="info" />
                                                <Label htmlFor="info" className="flex items-center gap-2 cursor-pointer w-full">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> Info (Blue)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                                                <RadioGroupItem value="warning" id="warning" />
                                                <Label htmlFor="warning" className="flex items-center gap-2 cursor-pointer w-full">
                                                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Warning (Amber)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                                                <RadioGroupItem value="alert" id="alert" />
                                                <Label htmlFor="alert" className="flex items-center gap-2 cursor-pointer w-full">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> Alert (Red)
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                                                <Label>Display Mode</Label>
                                            </div>
                                            <div className="flex items-center justify-between border p-3 rounded-md">
                                                <Label htmlFor="popup-toggle" className="text-sm font-medium cursor-pointer">Show as Pop-up Modal</Label>
                                                <Switch
                                                    id="popup-toggle"
                                                    checked={broadcast.isPopup}
                                                    onCheckedChange={(checked) => setBroadcast({ ...broadcast, isPopup: checked })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                                                <Label>Auto-Expire Timer</Label>
                                            </div>
                                            <Select value={duration} onValueChange={handleDurationChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select duration" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="never">Never Expire</SelectItem>
                                                    <SelectItem value="1">1 Hour</SelectItem>
                                                    <SelectItem value="6">6 Hours</SelectItem>
                                                    <SelectItem value="12">12 Hours</SelectItem>
                                                    <SelectItem value="24">24 Hours</SelectItem>
                                                    <SelectItem value="72">3 Days</SelectItem>
                                                    <SelectItem value="168">7 Days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {broadcast.expiresAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Expires: {new Date(broadcast.expiresAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="enable-broadcast"
                                            checked={broadcast.active}
                                            onCheckedChange={(checked) => setBroadcast({ ...broadcast, active: checked })}
                                            className="data-[state=checked]:bg-green-500"
                                        />
                                        <Label htmlFor="enable-broadcast" className="font-bold cursor-pointer">Enable Broadcast</Label>
                                    </div>
                                    <Button onClick={saveBroadcast} disabled={loading} className="shadow-premium hover:shadow-premium-hover transition-all">
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Maintenance Mode Card */}
                        <Card className="border-red-100 dark:border-red-900/20">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Construction className="h-5 w-5 text-red-600" />
                                    <CardTitle className="text-red-700 dark:text-red-500">Maintenance Mode</CardTitle>
                                </div>
                                <CardDescription>
                                    Lock the application for all non-admin users. Use with caution.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="maintenance-toggle" className="text-base font-bold cursor-pointer">Lock Application</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Only admins will be able to log in or access pages.
                                        </p>
                                    </div>
                                    <Switch
                                        id="maintenance-toggle"
                                        checked={maintenance.active}
                                        onCheckedChange={saveMaintenance}
                                        className="data-[state=checked]:bg-red-600"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TAB 2: DIRECT MESSAGES --- */}
                <TabsContent value="messages" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-indigo-600" />
                                    <CardTitle>Send Notification</CardTitle>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                                            <History className="h-3.5 w-3.5" /> Presets
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-[200px] p-0">
                                        <div className="p-2 grid gap-1">
                                            {PRESET_MESSAGES.map((preset, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => loadPreset(preset)}
                                                    className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <CardDescription>
                                Send a persistent message to a user's inbox.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="space-y-4">
                                    <Label className="flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Recipients
                                    </Label>
                                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
                                        {selectedUsers.length > 0 ? (
                                            <>
                                                {selectedUsers.map(user => (
                                                    <Badge
                                                        key={user.id}
                                                        variant="secondary"
                                                        className="pl-3 pr-1 py-1 gap-1 bg-white/50 dark:bg-black/20 border-indigo-200/50"
                                                    >
                                                        {user.display_name || user.id.slice(0, 8)}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 p-0 rounded-full hover:bg-red-100 hover:text-red-500"
                                                            onClick={() => toggleUserSelection(user.id, null)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </Badge>
                                                ))}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-red-500"
                                                    onClick={() => setSelectedUsers([])}
                                                >
                                                    Clear All
                                                </Button>
                                            </>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic px-2">No users selected. Select recipients below.</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox}
                                                    className="w-full justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Search className="h-4 w-4 opacity-50" />
                                                        <span>Search for users...</span>
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <CommandInput
                                                            placeholder="Type name to search..."
                                                            value={userSearchQuery}
                                                            onValueChange={setUserSearchQuery}
                                                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                        />
                                                    </div>
                                                    <CommandList>
                                                        <CommandEmpty>No user found.</CommandEmpty>
                                                        <CommandGroup heading="Results">
                                                            {userSearchResults.map((user) => (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    value={user.id}
                                                                    onSelect={() => {
                                                                        toggleUserSelection(user.id, user.display_name);
                                                                        // Keep open for multi-selection
                                                                    }}
                                                                    className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:opacity-100"
                                                                >
                                                                    <div className="flex items-center w-full pointer-events-auto">
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedUsers.some(u => u.id === user.id) ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{user.display_name || "Unknown User"}</span>
                                                                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                                                                                {user.id}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label>Message Content</Label>
                                <Textarea
                                    placeholder="Type your message..."
                                    className="min-h-[120px]"
                                    value={dmMessage}
                                    onChange={(e) => setDmMessage(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Notification Severity</Label>
                                    <Select value={dmType} onValueChange={(v: any) => setDmType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-blue-500" /> Information
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="success">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Success
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="warning">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Warning
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="alert">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" /> Critical Alert
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between border p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/30">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="nova-bot-toggle" className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 cursor-pointer">
                                            <Bot className="h-4 w-4" /> Send as Nova Bot
                                        </Label>
                                        <p className="text-xs text-indigo-600/80 dark:text-indigo-400/70">
                                            Appends signature and uses AI persona.
                                        </p>
                                    </div>
                                    <Switch
                                        id="nova-bot-toggle"
                                        checked={dmIsBot}
                                        onCheckedChange={setDmIsBot}
                                        className="data-[state=checked]:bg-indigo-500"
                                    />
                                </div>
                            </div>

                            <Button onClick={sendDirectMessage} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Send Private Message
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 3: MESSAGE HISTORY --- */}
                <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Communication History</CardTitle>
                                    <CardDescription>View all recent global and direct messages sent by administrators.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={historyLoading}>
                                    <History className={cn("h-4 w-4 mr-2", historyLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                {historyLoading && history.length === 0 ? (
                                    <div className="flex items-center justify-center h-40">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="text-center py-20 text-muted-foreground italic">
                                        No communication logs found.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.map((log) => (
                                            <div key={log.id} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={log.action === 'GLOBAL_NOTIFICATION' ? 'default' : 'secondary'} className="px-2 py-0">
                                                            {log.action === 'GLOBAL_NOTIFICATION' ? 'GLOBAL' : 'DIRECT'}
                                                        </Badge>
                                                        <span className="text-sm font-bold text-foreground capitalize">
                                                            {log.details?.title || 'No Title'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground mb-3 whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all cursor-help bg-background/50 p-2 rounded-lg border border-border/20">
                                                    {log.details?.message}
                                                </p>
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">Sent by:</span>
                                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{log.admin_name || log.admin_email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">Recipients:</span>
                                                        <span className="font-bold">{log.details?.count || 1}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
