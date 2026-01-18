import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Rocket, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { payfast } from '@/utils/payfast';
import { useAuth } from '@/hooks/useAuth';
import { showError, showLoading, showSuccess, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Pricing = () => {
    const { status, trialEndsAt, hasUsedTrial, planId } = useSubscription();
    const { user } = useAuth();
    const [isStartingTrial, setIsStartingTrial] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const handleUpgrade = (billingCycle: 'monthly' | 'annual' | 'lifetime' = 'monthly') => {
        console.log('Initiating upgrade for cycle:', billingCycle);
        if (!user?.email) {
            console.warn('User not logged in, cannot upgrade');
            showError('Please log in to upgrade to Nova Pro');
            return;
        }

        if (billingCycle === 'lifetime') {
            payfast.checkoutNovaLifetime(user.email, user.user_metadata?.full_name || 'User', user.id);
        } else {
            payfast.checkoutNovaPro(user.email, user.user_metadata?.full_name || 'User', user.id, billingCycle);
        }
    };

    const handlePlanClick = (plan: any) => {
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

            // Send Welcome Notification
            await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'Welcome to Nova Pro!',
                message: 'Your 3-day free trial has started. Enjoy unlimited access to all AI features.',
                type: 'system',
                read: false
            });

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
            features: [
                "10 Cards per Day (AI/Manual)",
                "3 Lifetime Essay Grades",
                "3 Generated Essay Questions",
                "10MB Upload Limit",
                "Basic Focus Timer (Midnight)"
            ],
            icon: Rocket,
            color: "blue",
            current: status === 'none' || status === 'expired',
            billingCycle: undefined
        },
        {
            name: "Pro Monthly",
            price: "R59.99",
            duration: "per month",
            features: [
                "500 Cards per Day",
                "100 Graded Essays",
                "300 Generated Questions",
                "45MB Uploads",
                "Premium Focus Timer (All Themes)",
                "Unlimited Magic Fix"
            ],
            icon: Zap,
            color: "blue",
            current: (status === 'active' || status === 'trialing') && (planId === 'pro-monthly' || !planId), // Default to monthly if no planId
            billingCycle: 'monthly' as const,
            trialAvailable: !hasUsedTrial && status !== 'active' && status !== 'trialing'
        },
        {
            name: "Annual",
            price: "R619.99",
            duration: "per year",
            features: ["All Pro Features", "Priority Support", "Early Access to New Features"],
            icon: Crown,
            color: "amber",
            current: (status === 'active' || status === 'trialing') && planId === 'pro-annual',
            recommended: true,
            billingCycle: 'annual' as const,
            tag: "Save R100"
        },
        {
            name: "Lifetime Access",
            price: "R1,999",
            duration: "one-time",
            features: ["Pay once, own forever", "All Future Pro Features", "VIP Support Channel", "Founding Member Badge"],
            icon: Crown,
            color: "purple",
            current: planId === 'pro-lifetime',
            recommended: false,
            billingCycle: 'lifetime' as const,
            tag: "Launch Special",
            originalPrice: "R3,499"
        }
    ];

    const handleCancelSubscription = async () => {
        // Native confirm removed, handled by AlertDialog

        if (!user?.id) {
            showError("User not found.");
            return;
        }

        const toastId = showLoading("Contacting PayFast to cancel...");
        try {
            // Call our new backend API to cancel at PayFast + Update DB
            await payfast.cancelSubscription(user.id);

            // Send Cancellation Notification
            await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'Subscription Canceled',
                message: 'Your subscription has been canceled. You will retain access until the end of your current billing period.',
                type: 'system',
                read: false
            });

            showSuccess("Subscription canceled successfully. No further charges will be made.");
            // Slight delay before reload to ensure toast is visible and avoid DOM race conditions
            setTimeout(() => {
                console.log("Reloading after successful cancellation...");
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error("Cancellation failed:", error);
            showError("Cancellation failed: " + (error.message || "Please contact support."));
        } finally {
            dismissToast(toastId);
        }
    };

    return (
        <>
            <div className="w-full max-w-[1600px] mx-auto py-12 px-4 pb-32 md:pb-12 animate-fade-in">
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

                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8 mt-8 p-4">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={`relative flex flex-col overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${plan.recommended ? 'border-amber-500 shadow-lg md:scale-105 z-10' : 'border-border'}`}>
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
                                    <div key={feature} className="flex items-start gap-3 text-left">
                                        <div className="bg-green-100 p-1 rounded-full shrink-0 mt-0.5">
                                            <Check className="h-3 w-3 text-green-600" />
                                        </div>
                                        <span className="text-sm font-medium leading-tight">{feature}</span>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="pt-6 flex flex-col gap-3 pb-8">
                                {plan.trialAvailable ? (
                                    <>
                                        <Button
                                            className="w-full h-auto min-h-[3.5rem] py-3 px-4 text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg transition-all hover:scale-[1.02] whitespace-normal leading-tight"
                                            onClick={handleStartTrial}
                                            disabled={isStartingTrial}
                                        >
                                            <span className="flex-1">
                                                {isStartingTrial ? "Starting..." : "Start 3-Day Free Trial"}
                                            </span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full font-bold"
                                            onClick={() => handlePlanClick(plan)}
                                        >
                                            Skip Trial
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        className={`w-full h-auto min-h-[3.5rem] py-3 px-4 text-base font-bold transition-all whitespace-normal leading-tight ${plan.recommended ? 'bg-amber-500 hover:bg-amber-600 shadow-lg' : 'bg-primary hover:bg-primary/90'}`}
                                        disabled={plan.current || (status !== 'none' && status !== 'expired' && plan.price === 'R0')}
                                        onClick={() => {
                                            console.log("DEBUG: Clicked plan " + plan.name);
                                            handlePlanClick(plan);
                                        }}
                                    >
                                        <span className="flex-1">
                                            {plan.current ? 'Current Plan' : plan.price === 'R0' ? 'Active' : 'Choose ' + plan.name}
                                        </span>
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
                            onClick={() => setIsCancelDialogOpen(true)}
                        >
                            Cancel Subscription
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                            Canceling will prevent future charges. You retain access until the end of the current billing period.
                        </p>
                    </div>
                )}
            </div>

            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent className="rounded-2xl shadow-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-red-500 hover:bg-red-600 rounded-xl"
                        >
                            Yes, Cancel
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default Pricing;
