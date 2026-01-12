import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Rocket, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { payfast } from '@/utils/payfast';
import { useAuth } from '@/hooks/useAuth';
import { showError, showLoading, showSuccess, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Pricing = () => {
    const { status, trialEndsAt, hasUsedTrial } = useSubscription();
    const { user } = useAuth();
    const [isStartingTrial, setIsStartingTrial] = useState(false);

    const handleUpgrade = (billingCycle: 'monthly' | 'annual' = 'monthly') => {
        console.log('Initiating upgrade for cycle:', billingCycle);
        if (!user?.email) {
            console.warn('User not logged in, cannot upgrade');
            showError('Please log in to upgrade to Nova Pro');
            return;
        }
        payfast.checkoutNovaPro(user.email, user.user_metadata?.full_name || 'User', billingCycle);
    };

    const handlePlanClick = (plan: typeof plans[0]) => {
        if (plan.price === 'R0') return;
        console.log('Plan clicked:', plan.name);
        handleUpgrade(plan.billingCycle);
    };

    const handleStartTrial = async () => {
        if (!user) {
            showError('Please log in to start your trial');
            return;
        }
        setIsStartingTrial(true);
        try {
            const { error } = await supabase.rpc('start_pro_trial');
            if (error) throw error;
            window.location.reload(); // Refresh to show trial status
        } catch (error: any) {
            console.error("Trial error:", error);
            showError(error.message || "Failed to start trial");
        } finally {
            setIsStartingTrial(false);
        }
    };

    const plans = [
        {
            name: "Free Plan",
            price: "R0",
            duration: "Forever",
            features: ["All Nova AI features", "Quiz Generation", "Essay Practice", "5 Study Sets max", "10MB Upload Limit"],
            icon: Rocket,
            color: "blue",
            current: status === 'none' || status === 'expired',
            billingCycle: undefined
        },
        {
            name: "Pro Monthly",
            price: "R59.99",
            duration: "per month",
            features: ["Unlimited AI Generations", "Unlimited Study Sets", "Massive 100MB Uploads", "Slides, Docs & Image Support", "Advanced Voice (TTS)", "Direct Support"],
            icon: Zap,
            color: "blue",
            current: (status === 'active' || status === 'trialing') && false, // Logic simplified for grid
            billingCycle: 'monthly' as const,
            trialAvailable: !hasUsedTrial && status !== 'active' && status !== 'trialing'
        },
        {
            name: "Annual",
            price: "R619.99",
            duration: "per year",
            features: ["All Pro Features", "Save R100 instantly", "Priority Support", "Early Access to New Features"],
            icon: Crown,
            color: "amber",
            current: false,
            recommended: true,
            billingCycle: 'annual' as const,
            tag: "Save R100"
        }
    ];

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.")) return;

        const toastId = showLoading("Canceling subscription...");
        try {
            const { error } = await supabase.rpc('cancel_subscription');
            if (error) throw error;
            showSuccess("Subscription canceled. You have access until the period ends.");
            window.location.reload();
        } catch (error: any) {
            showError("Failed to cancel: " + error.message);
        } finally {
            dismissToast(toastId);
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto py-12 px-4 pb-32 md:pb-12 animate-fade-in">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Power Up Your <span className="text-primary italic">Learning</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Unlock the full potential of Nova AI with a subscription. Cancel anytime.
                    </p>
                    {status === 'trialing' && trialEndsAt && (
                        <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold border border-primary/20 animate-pulse">
                            🚀 3-Day Pro Trial Active! Ends {trialEndsAt.toLocaleDateString()}
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-3 gap-8 mt-8">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={`relative flex flex-col overflow-hidden border-2 transition-all hover:shadow-xl ${plan.recommended ? 'border-amber-500 shadow-lg scale-105 z-10' : 'border-border'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-4 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">
                                    Best Value
                                </div>
                            )}
                            {plan.tag && (
                                <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-4 py-1 rounded-br-lg uppercase tracking-widest shadow-sm">
                                    {plan.tag}
                                </div>
                            )}
                            <CardHeader className="text-center pb-2">
                                <div className={`mx-auto mb-4 p-3 rounded-2xl w-fit ${plan.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <plan.icon className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                                    {plan.name}
                                </CardTitle>
                                <div className="mt-4">
                                    <span className="text-4xl font-extrabold">{plan.price}</span>
                                    <span className="text-muted-foreground ml-1">{plan.duration}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow pt-6 space-y-4">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-center gap-3">
                                        <div className="bg-green-100 p-1 rounded-full shrink-0">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <span className="text-sm font-medium">{feature}</span>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="pt-6 flex flex-col gap-3">
                                {plan.trialAvailable ? (
                                    <>
                                        <Button
                                            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg transition-all hover:scale-[1.02]"
                                            onClick={handleStartTrial}
                                            disabled={isStartingTrial}
                                        >
                                            {isStartingTrial ? "Starting..." : "Start 3-Day Free Trial"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full font-bold"
                                            onClick={() => handlePlanClick(plan)}
                                        >
                                            Skip Trial & Subscribe
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        className={`w-full py-6 text-lg font-bold transition-all ${plan.recommended ? 'bg-amber-500 hover:bg-amber-600 shadow-lg' : 'bg-primary hover:bg-primary/90'}`}
                                        disabled={plan.current || (status !== 'none' && status !== 'expired' && plan.price === 'R0')}
                                        onClick={() => {
                                            console.log("DEBUG: Clicked plan " + plan.name);
                                            handlePlanClick(plan);
                                        }}
                                    >
                                        {plan.current ? 'Current Plan' : plan.price === 'R0' ? 'Active' : 'Choose ' + plan.name}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {(status === 'active' || status === 'trialing') && (
                    <div className="mt-12 text-center">
                        <p className="text-muted-foreground mb-4">
                            Want to manage your subscription?
                        </p>
                        <Button
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={handleCancelSubscription}
                        >
                            Cancel Subscription
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                            Canceling will prevent future charges. You retain access until the end of the current billing period.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Pricing;
