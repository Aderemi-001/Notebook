import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PremiumGateProps {
    feature: string;
    children?: React.ReactNode;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ feature, children }) => {
    const { isPremium, loading, status, trialEndsAt } = useSubscription();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isPremium) {
        return <>{children}</>;
    }

    return (
        <div className="flex items-center justify-center min-h-[500px] p-4">
            <Card className="max-w-md w-full border-2 border-amber-500/20 shadow-2xl">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 w-fit">
                        <Crown className="h-12 w-12 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Premium Feature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span className="font-medium">{feature}</span>
                        </div>
                        {status === 'expired' && trialEndsAt && (
                            <p className="text-sm text-red-600 font-semibold">
                                Your trial ended on {trialEndsAt.toLocaleDateString()}
                            </p>
                        )}
                        {status === 'none' && (
                            <p className="text-sm text-muted-foreground">
                                Sign up to start your 3-day free trial
                            </p>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        Upgrade to **Nova Pro** to unlock unlimited AI-powered study tools and accelerate your learning.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => navigate('/pricing')}
                            className="w-full bg-amber-500 hover:bg-amber-600 font-bold py-6"
                        >
                            <Crown className="mr-2 h-5 w-5" />
                            Upgrade to Pro
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="w-full"
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
