import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsAndConditions: React.FC = () => {
    return (
        <div className="w-full px-4 md:px-8 py-10 max-w-4xl animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="ghost" asChild>
                    <Link to="/">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Link>
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Last updated: January 2026</span>
                </div>
            </div>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3">
                        Terms and Conditions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] pr-4 rounded-md border p-6 bg-background/50 backdrop-blur-sm">
                        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
                                <p>
                                    By accessing and using Notebook ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">2. Use of Service</h3>
                                <p>
                                    You agree to use the Service for lawful purposes only. You are responsible for all content, including study sets, notes, and messages, that you upload, post, email, or otherwise transmit via the Service.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>You must not transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or libellous.</li>
                                    <li>You must not violate any applicable local, state, national, or international law.</li>
                                    <li>You must not imposter any person or entity.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">3. Intellectual Property</h3>
                                <p>
                                    The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of Notebook and its licensors. The Service is protected by copyright, trademark, and other laws of both the country and foreign countries.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">4. User Content</h3>
                                <p>
                                    You retain ownership of any intellectual property rights that you hold in that content. In short, what belongs to you stays yours. However, by uploading content to Notebook, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content in connection with providing the Service.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">5. Privacy</h3>
                                <p>
                                    Your privacy is important to us. Please read our Privacy Policy to understand how we collect, use, and share information about you.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">6. Subscription Cancellation</h3>
                                <p>
                                    You may cancel your Nova Pro subscription at any time. If you cancel, you will continue to have access to the pro features until the end of your current billing period. No further charges will be applied after cancellation. To cancel, verify your subscription status on the Pricing page or contact support.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">7. Termination</h3>
                                <p>
                                    We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">8. Changes to Terms</h3>
                                <p>
                                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">9. Contact Us</h3>
                                <p>
                                    If you have any questions about these Terms, please contact us at my.notebook.by.remi@gmail.com.
                                </p>
                            </section>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Notebook. All rights reserved.</p>
            </div>
        </div>
    );
};

export default TermsAndConditions;
