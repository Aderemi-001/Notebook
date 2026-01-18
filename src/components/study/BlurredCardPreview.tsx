import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BlurredCardPreviewProps {
    index: number;
}

export const BlurredCardPreview = ({ index }: BlurredCardPreviewProps) => {
    const navigate = useNavigate();

    return (
        <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
                {/* Lock Icon */}
                <div className="bg-primary/10 backdrop-blur-sm rounded-full p-4 border border-primary/20">
                    <Lock className="h-8 w-8 text-primary" />
                </div>

                {/* Card Number */}
                <h3 className="text-lg font-bold text-foreground">Card #{index + 1} Locked</h3>

                {/* Upgrade Button */}
                <Button
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-bold shadow-lg"
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                </Button>
            </div>
        </Card>
    );
};
