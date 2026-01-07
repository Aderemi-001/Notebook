import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, TrendingUp, Sparkles, Brain, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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



// --- Component ---

const SmartStudySuggestions: React.FC<{ layout?: 'default' | 'compact' }> = ({ layout = 'default' }) => {
    // Explicitly casting or assuming type safety to handle potential library resolution issues
    const { data: suggestions, isLoading } = useSmartSuggestions();

    if (isLoading || !suggestions || suggestions.length === 0) return null;

    return (
        <section className="mb-8 animate-fade-in">
            <AIInsightHeader suggestions={suggestions} />

            <div className={cn(
                "grid gap-4 mt-4",
                layout === 'compact' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}>
                {(suggestions as SmartSuggestion[]).map((suggestion: SmartSuggestion) => (
                    <SuggestionCard key={suggestion.setId} suggestion={suggestion} />
                ))}
            </div>
        </section>
    );
};

// --- Sub-components ---

function AIInsightHeader({ suggestions }: { suggestions: SmartSuggestion[] }) {
    const [insight, setInsight] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (suggestions.length === 0) return;

        const hour = new Date().getHours();
        let greeting = "";
        if (hour < 5) greeting = "Late night study session?";
        else if (hour < 12) greeting = "Good morning!";
        else if (hour < 18) greeting = "Good afternoon!";
        else greeting = "Good evening!";

        const topSuggestion = suggestions[0];
        let tip = "";

        if (topSuggestion.type === 'review') {
            tip = `I recommend starting with **${topSuggestion.title}** to clear your backlog.`;
        } else if (topSuggestion.type === 'mastery') {
            tip = `You're so close to mastering **${topSuggestion.title}**. Keep going!`;
        } else {
            tip = `It's been a while since you practiced **${topSuggestion.title}**.`;
        }

        setInsight(`${greeting} ${tip}`);
    }, [suggestions]);

    if (!insight) return null;

    return (
        <div className="flex items-start md:items-center gap-3 mb-2">
            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-md text-white">
                <Sparkles className="h-5 w-5" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Nova Suggestions
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.split(/(\*\*.*?\*\*)/).map((part: string, index: number) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={index} className="font-semibold text-primary">
                                {part.slice(2, -2)}
                            </strong>
                        ) : part
                    )}
                </p>
            </div>
        </div>
    );
}

const SuggestionCard: React.FC<{ suggestion: SmartSuggestion }> = ({ suggestion }) => {
    const { type, title, reason, setId } = suggestion;

    return (
        <div className="group relative overflow-hidden bg-card hover:bg-accent/5 transition-colors border rounded-xl shadow-sm hover:shadow-md">
            {/* Decor line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${type === 'review' ? 'bg-orange-500' :
                type === 'mastery' ? 'bg-green-500' :
                    'bg-blue-500'
                }`} />

            <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                    <SuggestionBadge type={type} />
                </div>

                <h4 className="font-bold text-lg text-foreground mb-1 line-clamp-1" title={title}>
                    {title}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                    {reason}
                </p>

                <Button asChild className="w-full bg-secondary/50 text-secondary-foreground hover:bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-none">
                    <Link to={`/sets/${setId}/study`} className="flex items-center justify-center gap-2">
                        <span>Study Now</span>
                        <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </div>
        </div>
    );
};

const SuggestionBadge: React.FC<{ type: SmartSuggestion['type'] }> = ({ type }) => {
    const config: Record<SmartSuggestion['type'], { icon: LucideIcon, label: string, color: string }> = {
        review: { icon: Clock, label: 'Due for Review', color: 'text-orange-500 bg-orange-500/10' },
        mastery: { icon: TrendingUp, label: 'Near Mastery', color: 'text-green-500 bg-green-500/10' },
        decay: { icon: Brain, label: 'Spaced Repetition', color: 'text-blue-500 bg-blue-500/10' },
    };

    const { icon: Icon, label, color } = config[type];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
            <Icon className="h-3 w-3" />
            {label}
        </div>
    );
};

export default SmartStudySuggestions;
