import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, TrendingUp, Sparkles, Brain, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

// --- Types ---

interface StudySet {
    id: string;
    title: string;
}

interface CardData {
    id: string;
    set_id: string;
}

interface UserProgress {
    card_id: string;
    next_review_at: string;
    repetition_level: number;
    last_reviewed_at: string | null;
}

export interface SmartSuggestion {
    setId: string;
    title: string;
    reason: string;
    type: 'review' | 'mastery' | 'decay';
    priority: number;
    count?: number;
}

// --- Logic ---

/**
 * Pure function to calculate study suggestions based on raw data.
 * This isolates business logic for easier testing and maintenance.
 */
function calculateSuggestions(
    sets: StudySet[],
    cards: CardData[],
    progressMap: Map<string, UserProgress>
): SmartSuggestion[] {
    const calculatedSuggestions: SmartSuggestion[] = [];
    const now = new Date();

    sets.forEach(set => {
        const setCards = cards.filter(c => c.set_id === set.id);
        if (setCards.length === 0) return;

        let dueCount = 0;
        let masteredCount = 0;
        let hasAnyProgress = false;

        setCards.forEach(card => {
            const p = progressMap.get(card.id);
            if (p) {
                hasAnyProgress = true;

                // Mastery (Level 4+ is considered mastered)
                if (p.repetition_level >= 4) masteredCount++;

                // Due for review
                if (new Date(p.next_review_at) <= now) dueCount++;
            }
        });

        const masteryRate = (masteredCount / setCards.length) * 100;

        // RULE 1: New Set (Never studied) - Top Priority
        if (!hasAnyProgress) {
            calculatedSuggestions.push({
                setId: set.id,
                title: set.title,
                reason: "New set - Start learning",
                type: 'review',
                priority: 999,
                count: setCards.length
            });
            return; // Exit early if matched
        }

        // RULE 2: High Urgency (Many Due)
        if (dueCount > 0) {
            calculatedSuggestions.push({
                setId: set.id,
                title: set.title,
                reason: `${dueCount} cards due for review`,
                type: 'review',
                priority: dueCount * 2,
                count: dueCount
            });
            return;
        }

        // RULE 3: Decay (Legacy refresh) - Only if nothing is due
        const studyDates = setCards
            .map(card => progressMap.get(card.id)?.last_reviewed_at)
            .filter((d): d is string => !!d)
            .map(d => new Date(d));

        let lastStudiedDate: Date | null = null;
        if (studyDates.length > 0) {
            // Find the most recent date
            const maxTime = Math.max(...studyDates.map(d => d.getTime()));
            lastStudiedDate = new Date(maxTime);
        }

        if (lastStudiedDate) {
            const daysSince = Math.floor((now.getTime() - lastStudiedDate.getTime()) / (1000 * 60 * 60 * 24));

            // Suggest only if significant time passed (5+ days) and not perfectly mastered
            if (daysSince > 5 && masteryRate < 100) {
                calculatedSuggestions.push({
                    setId: set.id,
                    title: set.title,
                    reason: `Refresh memory (last studied ${daysSince} days ago)`,
                    type: 'decay',
                    priority: daysSince * 0.5
                });
                return;
            }
        }

        // RULE 4: Mastery Push (Close to finishing)
        if (masteryRate > 70 && masteryRate < 100) {
            calculatedSuggestions.push({
                setId: set.id,
                title: set.title,
                reason: `${Math.round(masteryRate)}% Mastered - Finish it!`,
                type: 'mastery',
                priority: 10
            });
        }
    });

    // Deduplicate: If a set triggered multiple rules (unlikely with returns, but safe to keep), take highest priority
    const unique = new Map<string, SmartSuggestion>();
    calculatedSuggestions.forEach(s => {
        const existing = unique.get(s.setId);
        if (!existing || s.priority > existing.priority) {
            unique.set(s.setId, s);
        }
    });

    return Array.from(unique.values())
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);
}

// --- Hook ---

/**
 * Custom hook to fetch data and derive smart study suggestions.
 */
function useSmartSuggestions() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['smart-suggestions', user?.id],
        queryFn: async (): Promise<SmartSuggestion[]> => {
            if (!user) return [];

            // Parallel fetching for Sets and Cards could be slightly faster, 
            // but dependent data (sets -> cards) is safer sequentially or we fetch all.
            // Current approach: 
            // 1. Sets
            // 2. Cards (optimized inner join)
            // 3. Progress

            const setsPromise = supabase
                .from('study_sets')
                .select('id, title')
                .eq('user_id', user.id);

            const cardsPromise = supabase
                .from('cards')
                .select('id, set_id, study_sets!inner(user_id)')
                .eq('study_sets.user_id', user.id);

            const progressPromise = supabase
                .from('user_progress')
                .select('card_id, next_review_at, repetition_level, last_reviewed_at')
                .eq('user_id', user.id);

            // Run requests in parallel
            const [setsRes, cardsRes, progressRes] = await Promise.all([
                setsPromise,
                cardsPromise,
                progressPromise
            ]);

            const sets = setsRes.data as StudySet[] || [];
            const cards = cardsRes.data as unknown as CardData[] || []; // Type assertion for inner join result
            const progressData = progressRes.data as unknown as UserProgress[] || [];

            if (sets.length === 0 || cards.length === 0) return [];

            // Create O(1) lookup map for progress
            const progressMap = new Map<string, UserProgress>();
            progressData.forEach(p => {
                if (p.card_id) progressMap.set(p.card_id, p);
            });

            return calculateSuggestions(sets, cards, progressMap);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}

function AIInsight({ suggestions }: { suggestions: SmartSuggestion[] }) {
    const [insight, setInsight] = React.useState<string | null>(null);

    React.useEffect(() => {
        const getInsight = () => {
            // Local "Smart" Logic (Zero API)
            if (suggestions.length === 0) return;

            const hour = new Date().getHours();
            let timeBasedMsg = "";

            if (hour < 12) timeBasedMsg = "Good morning! ☀️ Starting early builds strong memory.";
            else if (hour < 18) timeBasedMsg = "Good afternoon! ☕ Powering through the day?";
            else timeBasedMsg = "Good evening! 🌙 A quick review now sleeps better.";

            // Simple suggestion logic
            const topSuggestion = suggestions[0];
            let specificMsg = "";

            if (topSuggestion.type === 'review') {
                specificMsg = `Your priority is **${topSuggestion.title}** - tackle those due cards first.`;
            } else if (topSuggestion.type === 'mastery') {
                specificMsg = `You're crushing **${topSuggestion.title}**! Push to 100% mastery.`;
            } else {
                specificMsg = `Maybe refresh **${topSuggestion.title}**? It's been a while.`;
            }

            setInsight(`${timeBasedMsg} ${specificMsg}`);
        };
        getInsight();
    }, [suggestions]);

    if (!insight) return null;

    return (
        <div className="mt-4 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 flex items-start gap-3 animate-fade-in">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Nova Insight</div>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                    {insight.split(/(\*\*.*?\*\*)/).map((part: string, index: number) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={index} className="font-bold text-indigo-900 dark:text-indigo-100">
                                {part.slice(2, -2)}
                            </strong>
                        ) : part
                    )}
                </p>
            </div>
        </div>
    );
}

// --- Component ---

const SmartStudySuggestions: React.FC = () => {
    // Explicitly casting or assuming type safety to handle potential library resolution issues
    const { data: suggestions, isLoading } = useSmartSuggestions();

    if (isLoading || !suggestions || suggestions.length === 0) return null;

    return (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-indigo-100 dark:border-indigo-900 mb-6">
            <CardContent className="p-6">
                <Header />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(suggestions as SmartSuggestion[]).map((suggestion: SmartSuggestion) => (
                        <SuggestionCard key={suggestion.setId} suggestion={suggestion} />
                    ))}
                </div>
                <AIInsight suggestions={suggestions} />
            </CardContent>
        </Card>
    );
};

// Sub-components for cleaner render

const Header: React.FC = () => (
    <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h3 className="font-semibold text-lg text-indigo-900 dark:text-indigo-100">Recommended by Nova</h3>
    </div>
);

const SuggestionCard: React.FC<{ suggestion: SmartSuggestion }> = ({ suggestion }) => {
    const { type, title, reason, setId } = suggestion;

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm flex flex-col justify-between">
            <div>
                <SuggestionBadge type={type} />
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 truncate" title={title}>
                    {title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {reason}
                </p>
            </div>
            <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link to={`/sets/${setId}/study`}>
                    Study Now <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
            </Button>
        </div>
    );
};

const SuggestionBadge: React.FC<{ type: SmartSuggestion['type'] }> = ({ type }) => {
    const config: Record<SmartSuggestion['type'], { icon: LucideIcon, label: string }> = {
        review: { icon: Clock, label: 'Due Now' },
        mastery: { icon: TrendingUp, label: 'Almost There' },
        decay: { icon: Clock, label: 'Refresh Memory' },
    };

    const { icon: Icon, label } = config[type];

    return (
        <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
        </div>
    );
};

export default SmartStudySuggestions;
