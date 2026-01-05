import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Plus, BookOpen, FileQuestion } from "lucide-react";

const QuickActions: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Find next set to study (has due cards)
    const { data: nextSet } = useQuery({
        queryKey: ['next-study-set', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Get sets with due cards
            const { data: sets } = await supabase
                .from('study_sets')
                .select('id, title')
                .eq('user_id', user.id)
                .limit(1);

            return sets?.[0] || null;
        },
        enabled: !!user,
    });

    const actions = [
        {
            icon: Play,
            label: nextSet ? `Continue: ${nextSet.title}` : "Start Studying",
            onClick: () => nextSet ? navigate(`/sets/${nextSet.id}/study`) : navigate('/sets'),
            variant: "default" as const,
            disabled: !nextSet
        },
        {
            icon: Plus,
            label: "Create Set",
            onClick: () => navigate('/create'),
            variant: "outline" as const
        },
        {
            icon: BookOpen,
            label: "My Notes",
            onClick: () => navigate('/notebook'),
            variant: "outline" as const
        },
        {
            icon: FileQuestion,
            label: "Practice Quiz",
            onClick: () => navigate('/exams'),
            variant: "outline" as const
        }
    ];

    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {actions.map((action, index) => (
                        <Button
                            key={index}
                            variant={action.variant}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="h-auto py-4 flex-col gap-2"
                        >
                            <action.icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{action.label}</span>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default QuickActions;
