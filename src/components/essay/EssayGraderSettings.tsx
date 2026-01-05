import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Settings, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { analyzeEssay, EssayMetrics } from '@/utils/essayGrader';

interface GradingConfig {
    id: string;
    target_grade_level: number;
    target_sentence_length: number;
    target_transition_density: number;
    is_calibrated: boolean;
}

export const EssayGraderSettings: React.FC<{ onConfigUpdate: () => void }> = ({ onConfigUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [calibrationText, setCalibrationText] = useState('');
    const [config, setConfig] = useState<GradingConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCalibrating, setIsCalibrating] = useState(false);

    // Fetch existing config
    useEffect(() => {
        if (isOpen) fetchConfig();
    }, [isOpen]);

    const fetchConfig = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('grading_configs')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "Not Found"
            console.error('Error fetching config:', error);
        }

        if (data) setConfig(data);
        setIsLoading(false);
    };

    const handleCalibrate = async () => {
        if (!calibrationText.trim()) return;
        setIsCalibrating(true);

        try {
            // 1. Analyze the "Gold Standard" essay
            // We use the same engine, but extract the raw metrics as targets
            const analysis = analyzeEssay(calibrationText);
            const metrics = analysis.metrics;

            // 2. Prepare the config
            const newConfig = {
                target_grade_level: metrics.gradeLevel,
                target_sentence_length: metrics.avgSentenceLength,
                target_transition_density: metrics.transitionWordCount / Math.max(1, metrics.paragraphCount),
                is_calibrated: true,
                calibration_essay_text: calibrationText
            };

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            // 3. Save to DB (Upsert)
            const { error } = await supabase
                .from('grading_configs')
                .upsert({
                    user_id: user.id,
                    ...newConfig,
                    // updated_at removed to match simplified schema
                });

            if (error) throw error;

            showSuccess("Grader Calibrated! New 'Gold Standard' set.");
            setIsOpen(false);
            fetchConfig(); // Refresh
            onConfigUpdate(); // Notify parent

        } catch (error: any) {
            console.error("Calibration Error Full Object:", error);
            const msg = error?.message || error?.error_description || JSON.stringify(error) || "Unknown error";

            if (msg.includes("relation") && msg.includes("does not exist")) {
                showError("Database table missing. Did you run the SQL migration?");
            } else {
                showError("Calibration failed: " + msg);
            }
        } finally {
            setIsCalibrating(false);
        }
    };

    const handleReset = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('grading_configs').delete().eq('user_id', user.id);
        if (error) {
            showError("Reset failed");
        } else {
            setConfig(null);
            setCalibrationText('');
            showSuccess("Restored to default settings.");
            onConfigUpdate();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    {config?.is_calibrated ? "Calibrated (Active)" : "Configure Grader"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Train Your Grader 🧠</DialogTitle>
                    <DialogDescription>
                        Teach the AI what a "Perfect Essay" looks like to you. It will adjust its strictness to match your style.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {config?.is_calibrated ? (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <h3 className="font-semibold text-green-800 dark:text-green-300">Calibration Active</h3>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-400 mb-4">
                                The grader is currently adapted to your personal style.
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-background/50 p-2 rounded">
                                    <div className="font-bold">{config.target_grade_level}</div>
                                    <div className="text-xs text-muted-foreground">Target Level</div>
                                </div>
                                <div className="bg-background/50 p-2 rounded">
                                    <div className="font-bold">{config.target_sentence_length}</div>
                                    <div className="text-xs text-muted-foreground">Avg Words/Sent</div>
                                </div>
                                <div className="bg-background/50 p-2 rounded">
                                    <div className="font-bold">{parseFloat(config.target_transition_density.toFixed(1))}</div>
                                    <div className="text-xs text-muted-foreground">Flow Score</div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleReset} className="mt-4 w-full text-red-500 hover:text-red-600">
                                <RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-blue-800 dark:text-blue-300 text-sm">
                                <AlertCircle className="h-4 w-4 inline mr-2" />
                                <strong>How it works:</strong> Paste an essay that represents "A+ work" (e.g., a past essay you did well on, or a sample text). The AI will analyze it and set it as the benchmark.
                            </div>
                            <div className="space-y-2">
                                <Label>Gold Standard Text</Label>
                                <Textarea
                                    placeholder="Paste your 'ideal' essay here..."
                                    value={calibrationText}
                                    onChange={e => setCalibrationText(e.target.value)}
                                    className="min-h-[200px]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!config?.is_calibrated && (
                        <Button onClick={handleCalibrate} disabled={isCalibrating || !calibrationText.trim()}>
                            {isCalibrating ? "Analyzing..." : "Calibrate AI"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
