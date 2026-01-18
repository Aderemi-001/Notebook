import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Brain, Save, Trash2, BookOpen, BarChart3, Lightbulb, Check } from 'lucide-react';
import { NovaAI } from '@/utils/NovaAI';
import { DetailedGrade, analyzeEssay } from '@/utils/essayGrader';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { essayService } from '@/services/essayService';



export interface EssayEditorProps {
    questionId: string;
    questionText: string;
    context?: string; // e.g. suggested_points[0]
    initialContent?: string;
    initialGrade?: DetailedGrade | null;
    onBack?: () => void; // Optional "Back" action (e.g. to list)
    backLabel?: string;
}

export const EssayEditor: React.FC<EssayEditorProps> = ({
    questionId,
    questionText,
    context,
    initialContent = '',
    initialGrade = null,
}) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [essayContent, setEssayContent] = useState(initialContent);
    const [currentGrade, setCurrentGrade] = useState<DetailedGrade | null>(initialGrade);

    // Magic Fix State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [tempImprovedText, setTempImprovedText] = useState("");
    const [isImproving, setIsImproving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Sync initial content if it changes (e.g. fresh fetch)
    useEffect(() => {
        if (initialContent && !essayContent) setEssayContent(initialContent);
        if (initialGrade) setCurrentGrade(initialGrade);
    }, [initialContent, initialGrade]);

    // Auto-save
    useEffect(() => {
        if (!essayContent.trim() || currentGrade) return;
        const timer = setTimeout(() => handleSaveDraft(true), 3000);
        return () => clearTimeout(timer);
    }, [essayContent, currentGrade]);

    const handleSaveDraft = async (silent = false) => {
        if (!essayContent.trim() || !user) return;

        const success = await essayService.saveSubmission({
            question_id: questionId,
            user_id: user.id,
            content: essayContent,
            score: currentGrade?.score || 0,
            letter_grade: currentGrade?.letterGrade || 'Draft',
            feedback: currentGrade?.feedback || 'Draft saved.',
            metrics: currentGrade?.metrics || {}
        });

        if (success) {
            if (!silent) showSuccess("Draft saved!");
            queryClient.invalidateQueries({ queryKey: ['essaySubmission', questionId] });
        } else {
            if (!silent) showError("Failed to save draft");
        }
    };


    const gradeMutation = useMutation({
        mutationFn: async (text: string) => {
            // Check limits first? Ideally server side, but client check helps UX
            // Call Edge Function
            const { data: gradeResponse, error: edgeError } = await supabase.functions.invoke('grade-essay', {
                body: {
                    question: questionText,
                    context: context || '',
                    essay: text,
                }
            });

            if (edgeError) throw new Error(edgeError.message);
            if (!gradeResponse?.grade) throw new Error("Invalid response from AI");

            const grade = gradeResponse.grade;

            // Calculate Local Metrics using essayGrader utility
            const localAnalysis = analyzeEssay(text, [], null);

            const metrics = {
                ...localAnalysis.metrics,
                readabilityScore: grade.score, // Use AI score if preferred, or local. AI is "grade.score" (0-100)
                // gradeLevel is now provided by localAnalysis
                // uniqueWordPercentage is now provided by localAnalysis
            };

            if (user) {
                await essayService.saveSubmission({
                    question_id: questionId,
                    user_id: user.id,
                    content: text,
                    score: grade.score,
                    letter_grade: grade.score >= 90 ? 'A' : grade.score >= 80 ? 'B' : grade.score >= 70 ? 'C' : grade.score >= 60 ? 'D' : 'F',
                    feedback: grade.feedback,
                    metrics: { ...metrics, strengths: grade.strengths, improvements: grade.improvements }
                });
            }


            return {
                score: grade.score,
                letterGrade: grade.score >= 90 ? 'A' : grade.score >= 80 ? 'B' : grade.score >= 70 ? 'C' : grade.score >= 60 ? 'D' : 'F',
                feedback: grade.feedback,
                metrics: metrics,
                pointsCovered: grade.strengths,
                pointsMissed: grade.improvements,
                structureFeedback: [],
                contentFeedback: [],
                coherenceFeedback: [],
                styleFeedback: []
            } as DetailedGrade;
        },
        onSuccess: (result) => {
            setCurrentGrade(result);
            showSuccess("Graded successfully!");
            queryClient.invalidateQueries({ queryKey: ['essayCount'] });
            queryClient.invalidateQueries({ queryKey: ['essayLimitCheck'] });
        },
        onError: (err) => showError(err.message)
    });

    const handleGrade = async () => {
        // Basic Client Limit Check (Optional, but good for UX)
        // We assume parent or hook handles detailed check, but we can do a quick check here if we fetch limits
        if (!essayContent.trim()) return;
        gradeMutation.mutate(essayContent);
    };

    const handleImproveText = async (type: 'flow' | 'grammar' | 'conciseness') => {
        if (!essayContent.trim()) return;
        setIsImproving(true);
        try {
            const improved = await NovaAI.improveText(essayContent, type);
            setTempImprovedText(improved);
            setIsPreviewOpen(true);
        } catch (e) {
            showError("Could not improve text");
        } finally {
            setIsImproving(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        try {
            const { error } = await supabase.from('essay_submissions').delete().eq('question_id', questionId).eq('user_id', user.id);
            if (error) throw error;
            setEssayContent('');
            setCurrentGrade(null);
            setIsDeleteDialogOpen(false);
            showSuccess("Reset successfully.");
            queryClient.invalidateQueries({ queryKey: ['essayCount'] });
            // If we are in 'Practice' mode, maybe we want to reload? 
            // Current behavior: just clear editor
        } catch (e: any) {
            showError(e.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
                {/* Question Card */}
                <Card className={cn("glass-card shadow-premium rounded-[2.5rem] border-white/20 transition-all duration-300", currentGrade ? "border-l-4 border-l-primary" : "")}>
                    <CardHeader>
                        <CardTitle className="text-xl">{questionText}</CardTitle>
                        {context && <CardDescription>{context}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">Target Audience: Academic. Tone: Formal.</p>
                    </CardContent>
                </Card>

                {/* Editor Card */}
                <Card className="glass-card shadow-premium rounded-[2.5rem] border-white/20">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle>Your Response</CardTitle>
                        {essayContent && (
                            <Badge variant="outline" className="font-mono text-xs">
                                {essayContent.split(/\s+/).filter(w => w.length > 0).length} words
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={essayContent}
                            onChange={e => setEssayContent(e.target.value)}
                            placeholder="Start writing..."
                            className="min-h-[300px] text-lg p-6 resize-y focus-visible:ring-primary/20"
                            disabled={gradeMutation.isPending}
                        />
                        <div className="flex justify-between items-center pt-2">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleImproveText('flow')} disabled={isImproving || !essayContent.trim()} className="text-purple-700 border-purple-200 hover:bg-purple-50">
                                    {isImproving ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />} Magic Fix
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(true)} title="Reset">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={() => handleSaveDraft(false)} disabled={!essayContent.trim()}>
                                    <Save className="h-4 w-4 mr-2" /> Save
                                </Button>
                                <Button onClick={handleGrade} disabled={gradeMutation.isPending || !essayContent.trim()} className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-md">
                                    {gradeMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Brain className="mr-2 h-4 w-4" />} Check My Essay
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results Pane */}
            <div className="lg:col-span-1">
                {currentGrade ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 sticky top-4">
                        <Card className="glass-card shadow-premium rounded-[2.5rem] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-purple-200/50">
                            <CardContent className="pt-6 text-center">
                                <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Overall Result</div>
                                <div className="text-5xl font-black text-foreground mb-2">{currentGrade.letterGrade}</div>
                                <Badge variant={currentGrade.score > 70 ? "default" : "secondary"}>{currentGrade.score > 70 ? "Passing Grade" : "Keep Practicing"}</Badge>
                                <p className="text-sm font-medium text-muted-foreground italic mt-3">"{currentGrade.feedback}"</p>
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="content" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="content">Content</TabsTrigger>
                                <TabsTrigger value="structure">Structure</TabsTrigger>
                            </TabsList>
                            <TabsContent value="content" className="space-y-4 mt-4">
                                <Card className="glass-card rounded-[2rem]">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-500" /> Key Concepts</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        <ul className="text-sm space-y-2 pl-4 border-l-2 border-green-100">
                                            {(currentGrade.pointsCovered || []).map((p: string, i: number) => <li key={i} className="text-muted-foreground">{p}</li>)}
                                        </ul>
                                        {(currentGrade.pointsMissed || []).length > 0 && (
                                            <><div className="text-xs font-semibold text-orange-600 mt-2 flex gap-1"><Lightbulb className="h-3 w-3" /> Suggestions</div>
                                                <ul className="text-sm space-y-2 pl-4 border-l-2 border-orange-100">
                                                    {(currentGrade.pointsMissed || []).map((p: string, i: number) => <li key={i} className="text-muted-foreground">{p}</li>)}
                                                </ul></>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="structure" className="space-y-4 mt-4">
                                <Card className="glass-card rounded-[2rem]">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Analysis</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-muted/40 p-2 rounded"><strong>{currentGrade.metrics?.gradeLevel || 'Standard'}</strong><div className="text-muted-foreground">Level</div></div>
                                            <div className="bg-muted/40 p-2 rounded"><strong>{currentGrade.metrics?.uniqueWordPercentage || 0}%</strong><div className="text-muted-foreground">Unique</div></div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs"><span>Readability</span><span>{currentGrade.metrics?.readabilityScore || 0}/100</span></div>
                                            <Progress value={currentGrade.metrics?.readabilityScore || 0} className="h-2" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10 h-64">
                        <Sparkles className="h-8 w-8 text-yellow-500 opacity-50 mb-4" />
                        <p className="text-sm">Submit to get Nova AI feedback!</p>
                    </div>
                )}
            </div>

            {/* Magic Fix Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] glass-card">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="text-purple-500" /> Nova's Magic Fix</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 flex-1 overflow-hidden">
                        <div className="flex flex-col gap-2"><h4 className="text-xs font-bold uppercase text-muted-foreground">Original</h4><div className="p-4 rounded-xl bg-muted/30 text-sm overflow-auto max-h-[400px]">{essayContent}</div></div>
                        <div className="flex flex-col gap-2"><h4 className="text-xs font-bold uppercase text-primary">Improved</h4><div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm overflow-auto max-h-[400px] font-medium">{tempImprovedText}</div></div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Discard</Button>
                        <Button onClick={() => { setEssayContent(tempImprovedText); setIsPreviewOpen(false); showSuccess("Applied!"); }} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"><Check className="mr-2 h-4 w-4" /> Apply Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Essay?</AlertDialogTitle>
                        <AlertDialogDescription>This will delete your current draft/grade. Cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Reset</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
