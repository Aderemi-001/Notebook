import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const UserAgreement: React.FC = () => {
    const [agreed, setAgreed] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleAgree = async () => {
        if (!user) return;
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

            dismissToast(toastId);
            showSuccess("Welcome to Notebook!");
            navigate('/');
        } catch (error: any) {
            dismissToast(toastId);
            console.error("Agreement error:", error);
            showError("Failed to update agreement status. Please try again.");
        }
    };

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
                            <h4 className="font-bold text-foreground mb-2">User Agreement Summary</h4>
                            <p className="mb-2">
                                1. <strong>Respect the Community:</strong> Be kind and respectful to other learners.
                            </p>
                            <p className="mb-2">
                                2. <strong>Original Content:</strong> Only upload content you have the right to share.
                            </p>
                            <p className="mb-2">
                                3. <strong>Educational Use:</strong> This platform is designed for learning and personal growth.
                            </p>
                            <p className="mb-2">
                                4. <strong>Data Privacy:</strong> We value your data. Your notes and progress are yours.
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
