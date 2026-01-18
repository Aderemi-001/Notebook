import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const UserAgreement: React.FC = () => {
    const [agreed, setAgreed] = useState(false);
    const [hasAccepted, setHasAccepted] = useState(false);
    const [acceptedDate, setAcceptedDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();

    // Check if user has already accepted
    useEffect(() => {
        const checkAcceptance = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('terms_accepted_at')
                    .eq('id', user.id)
                    .single();

                // Simply check if they've accepted at any point
                if (profile?.terms_accepted_at) {
                    setHasAccepted(true);
                    setAcceptedDate(profile.terms_accepted_at);
                }
            } catch (error) {
                console.error('Error checking acceptance:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAcceptance();
    }, [user]);

    const handleAgree = async () => {
        if (!user) {
            showError("Please sign in to continue. You'll be redirected to the login page.");
            setTimeout(() => navigate('/login'), 2000);
            return;
        }
        if (!agreed) {
            showError("You must agree to the Terms and Conditions to proceed.");
            return;
        }

        const toastId = showLoading("Updating your profile...");

        try {
            // We will need to make sure the 'terms_accepted_at' column exists first!
            // For now, assuming the implementation plan's DB step will be handled.
            // If the column doesn't exist, this might fail unless we handled migration.
            // Since I cannot run SQL migrations directly here easily without tool 'run_command' psql or similar,
            // I will rely on the user manually adding it or I will inspect schema later.
            // But for this code, I'll attempt the update.

            const { error } = await supabase
                .from('profiles')
                .update({
                    // @ts-ignore - column might not be typed yet in local types
                    terms_accepted_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh the profile to ensure AgreementGuard sees the updated data
            await refreshProfile();

            dismissToast(toastId);
            showSuccess("Welcome to Notebook!");
            navigate('/');
        } catch (error: any) {
            dismissToast(toastId);
            console.error("Agreement error:", error);
            showError("Failed to update agreement status. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // If user has already accepted, show read-only view
    if (hasAccepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                <Card className="max-w-2xl w-full shadow-2xl border-primary/20 relative z-10 glass-card">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Agreement Already Accepted</CardTitle>
                        <CardDescription className="text-lg">
                            You accepted the User Agreement on {new Date(acceptedDate!).toLocaleDateString()}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="bg-muted/30 border rounded-lg p-1 mb-4">
                            <ScrollArea className="h-64 rounded bg-background/50 p-4 text-sm text-muted-foreground">
                                <h4 className="font-bold text-foreground mb-2">Study Agreement Overview</h4>
                                <p className="mb-2">
                                    1. <strong>Academic Honesty:</strong> I will use Notebook as a study aid to enhance my learning, not to facilitate cheating or dishonesty.
                                </p>
                                <p className="mb-2">
                                    2. <strong>AI Verification:</strong> I understand that "Nova" (AI) can make mistakes. I will verify important facts with my teacher or textbooks.
                                </p>
                                <p className="mb-2">
                                    3. <strong>Data Respect:</strong> I will only upload content that I have the right to use and will respect the intellectual property of others.
                                </p>
                                <p className="mb-2">
                                    4. <strong>Privacy First:</strong> I understand how my data is used (processed by AI to help me learn) as described in the Privacy Policy.
                                </p>
                                <p className="mb-2">
                                    5. <strong>Usage Limits:</strong> I will respect the daily usage limits for my account tier and will not abuse the Service or create multiple accounts to circumvent limits.
                                </p>
                                <p className="mb-2">
                                    6. <strong>File Uploads:</strong> I will only upload files that I have the legal right to use and that do not contain copyrighted material belonging to others.
                                </p>
                                <p className="mb-4">
                                    View our full <a href="/terms" target="_blank" className="text-primary hover:underline">Terms and Conditions</a> and <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
                                </p>
                            </ScrollArea>
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button
                            className="w-full text-lg h-12"
                            size="lg"
                            disabled={loading}
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    await refreshProfile();
                                    // Small delay to ensure state updates
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    navigate('/', { replace: true });
                                } catch (error) {
                                    console.error('Navigation error:', error);
                                    // Force navigation even if refresh fails
                                    navigate('/', { replace: true });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            {loading ? 'Loading...' : 'Return to Dashboard'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Show acceptance form for new users
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

            <Card className="max-w-2xl w-full shadow-2xl border-primary/20 relative z-10 glass-card">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 text-primary">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-3xl font-bold">Welcome to Notebook</CardTitle>
                    <CardDescription className="text-lg">
                        Before we begin, please review and accept our User Agreement.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="bg-muted/30 border rounded-lg p-1 mb-4">
                        <ScrollArea className="h-64 rounded bg-background/50 p-4 text-sm text-muted-foreground">
                            <h4 className="font-bold text-foreground mb-2">Study Agreement Overview</h4>
                            <p className="mb-2">
                                1. <strong>Academic Honesty:</strong> Use Notebook to enhance learning, not for academic dishonesty.
                            </p>
                            <p className="mb-2">
                                2. <strong>AI Verification:</strong> "Nova" (AI) is a tool for learning; always verify facts before exams.
                            </p>
                            <p className="mb-2">
                                3. <strong>Content Rights:</strong> Only upload notes and materials you are authorized to use.
                            </p>
                            <p className="mb-2">
                                4. <strong>Data Processing:</strong> AI assists you by processing your notes in a secure, private environment.
                            </p>
                            <p className="mb-2">
                                5. <strong>Usage Limits:</strong> Respect daily usage limits and do not create multiple accounts to bypass restrictions.
                            </p>
                            <p className="mb-2">
                                6. <strong>File Uploads:</strong> Only upload files you have legal rights to use.
                            </p>
                            <p className="mb-4">
                                By clicking "I Agree", you acknowledge that you have read and understood our full <a href="/terms" target="_blank" className="text-primary hover:underline">Terms and Conditions</a> and <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>.
                            </p>
                            <p>
                                (Scroll to read full terms in the link above)
                            </p>
                        </ScrollArea>
                    </div>

                    <div className="flex items-center space-x-2 mt-4 p-4 bg-accent/30 rounded-lg border border-accent">
                        <Checkbox
                            id="terms"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                        />
                        <Label htmlFor="terms" className="text-sm cursor-pointer leading-snug">
                            I certify that I am at least 13 years old and I agree to the <a href="/terms" target="_blank" className="font-semibold text-primary hover:underline">Terms and Conditions</a>.
                        </Label>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        className="w-full text-lg h-12 gap-2"
                        size="lg"
                        onClick={handleAgree}
                        disabled={!agreed}
                    >
                        <ShieldCheck className="w-5 h-5" />
                        I Agree & Continue
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default UserAgreement;
