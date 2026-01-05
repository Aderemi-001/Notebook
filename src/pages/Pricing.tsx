import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Crown, Rocket } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';

const Pricing = () => {
    const { status, trialEndsAt } = useSubscription();

    const plans = [
        {
            name: "Free Trial",
            price: "$0",
            duration: "3 Days",
            features: ["All Nova AI features", "Quiz Generation", "Essay Practice", "5 Study Sets max"],
            icon: Rocket,
            color: "blue",
            current: status === 'trialing'
        },
        {
            name: "Nova Pro",
            price: "$9.99",
            duration: "per month",
            features: ["Unlimited AI Generations", "Unlimited Study Sets", "Priority Speed", "Advanced Voice (TTS)", "Direct Support"],
            icon: Crown,
            color: "amber",
            current: status === 'active',
            recommended: true
        }
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-12 px-4">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Power Up Your <span className="text-primary italic">Learning</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Unlock the full potential of Nova AI with a subscription.
                    </p>
                    {status === 'trialing' && trialEndsAt && (
                        <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold border border-primary/20">
                            Trial active until {trialEndsAt.toLocaleDateString()}
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-8">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={`relative flex flex-col overflow-hidden border-2 transition-all hover:shadow-2xl ${plan.recommended ? 'border-amber-500 shadow-xl scale-105 z-10' : 'border-border'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-4 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">
                                    Best Value
                                </div>
                            )}
                            <CardHeader className="text-center pb-2">
                                <div className={`mx-auto mb-4 p-3 rounded-2xl w-fit ${plan.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <plan.icon className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
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
                            <CardFooter className="pt-6">
                                <Button
                                    className={`w-full py-6 text-lg font-bold transition-all ${plan.recommended ? 'bg-amber-500 hover:bg-amber-600 shadow-lg' : 'bg-primary hover:bg-primary/90'}`}
                                    disabled={plan.current}
                                    onClick={() => alert('Stripe Checkout coming soon!')}
                                >
                                    {plan.current ? 'Current Plan' : plan.price === '$0' ? 'Free Access' : 'Upgrade to Pro'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 text-center space-y-4 max-w-2xl mx-auto">
                    <p className="text-muted-foreground text-sm">
                        You're currently in the **Version 2.0.4 "Supernova"** Early Access period.
                    </p>
                    <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex flex-col items-center">
                            <Zap className="h-6 w-6 mb-1 text-orange-500" />
                            <span className="text-[10px] font-bold">Groq Powered</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Crown className="h-6 w-6 mb-1 text-blue-500" />
                            <span className="text-[10px] font-bold">Gemini Fallback</span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Pricing;
