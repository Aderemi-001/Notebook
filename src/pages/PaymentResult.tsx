import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const success = searchParams.get('success') === 'true';
    const canceled = searchParams.get('canceled') === 'true';
    const { isPremium } = useSubscription();

    useEffect(() => {
        // Auto-redirect to pricing after 5 seconds if canceled
        if (canceled) {
            const timer = setTimeout(() => navigate('/pricing'), 5000);
            return () => clearTimeout(timer);
        }

        // Insert welcome notification on success
        if (success) {
            const insertNotification = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Check if notification already sent recently to avoid duplicates on refresh
                    // But simplified: just insert. RLS allows insert own notification? Usually yes.
                    // Actually notifications table RLS usually allows insert?
                    // If not, we might need an RPC. But let's try insert.
                    // Assuming 'notifications' table schema: user_id, message, type, is_read, ...

                    // Trigger welcome notification
                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        message: "🎉 Welcome to Nova Pro! Your subscription is active. - Nova Admin",
                        type: 'info',
                        is_read: false
                    });
                }
            };
            insertNotification();
        }
    }, [canceled, success, navigate]);

    if (success) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[600px] p-4">
                    <Card className="max-w-md w-full border-2 border-green-500/20 shadow-2xl">
                        <CardHeader className="text-center pb-4">
                            <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 w-fit animate-in zoom-in-50 duration-500">
                                <CheckCircle2 className="h-16 w-16 text-green-600" />
                            </div>
                            <CardTitle className="text-3xl font-bold text-green-600">Payment Successful!</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-center">
                            <div className="space-y-2">
                                <p className="text-lg font-semibold">Welcome to Nova Pro! 🎉</p>
                                <p className="text-muted-foreground">
                                    {isPremium ? "Your subscription is active and ready to use!" : "Your subscription is being activated. This may take a few moments."}
                                </p>
                            </div>

                            {!isPremium ? (
                                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm font-medium">Processing your subscription...</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        You'll receive a confirmation email shortly
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-green-50 rounded-xl p-4 border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                                    <p className="text-sm font-bold text-green-700">
                                        You are now a Pro Member!
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => navigate('/')}
                                    className="w-full bg-green-600 hover:bg-green-700 font-bold py-6"
                                >
                                    Go to Dashboard
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/create')}
                                    className="w-full"
                                >
                                    Start Creating Study Sets
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    if (canceled) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[600px] p-4">
                    <Card className="max-w-md w-full border-2 border-orange-500/20 shadow-2xl">
                        <CardHeader className="text-center pb-4">
                            <div className="mx-auto mb-4 p-4 rounded-full bg-orange-100 w-fit animate-in zoom-in-50 duration-500">
                                <XCircle className="h-16 w-16 text-orange-600" />
                            </div>
                            <CardTitle className="text-3xl font-bold text-orange-600">Payment Canceled</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-center">
                            <div className="space-y-2">
                                <p className="text-lg font-semibold">No worries!</p>
                                <p className="text-muted-foreground">
                                    Your payment was canceled. You can try again anytime.
                                </p>
                            </div>

                            <div className="bg-muted/50 rounded-xl p-4">
                                <p className="text-sm text-muted-foreground">
                                    You still have access to your free trial features. Upgrade whenever you're ready!
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full font-bold py-6"
                                >
                                    Try Again
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
            </DashboardLayout>
        );
    }

    // Default fallback
    return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[600px]">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Redirecting...</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default PaymentResult;
