import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsAndConditions: React.FC = () => {
    return (
        <div className="w-full mx-auto px-4 md:px-8 py-10 max-w-4xl animate-fade-in">
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
                                    By accessing and using Notebook (the "Service"), you accept and agree to be bound by the terms and provisions of this agreement. Our Service is designed to provide AI-assisted study tools, including card generation, essay analysis, and focus management. If you do not agree to these terms, please do not use the Service.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">2. AI Service Disclosure ("Nova")</h3>
                                <p>
                                    Our Service utilizes advanced Artificial Intelligence (AI) technologies, referred to as "Nova," powered by third-party providers including Google Gemini and Groq.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Information Accuracy:</strong> AI-generated content (e.g., flashcards, essay grades, magic fixes) is for educational purposes only. Machine learning models may produce inaccurate, incomplete, or biased information (commonly known as "hallucinations"). Users must verify critical information with official textbooks or instructors.</li>
                                    <li><strong>User Responsibility:</strong> You are solely responsible for how you use AI-generated outputs. Notebook is not liable for academic consequences resulting from the use of the Service.</li>
                                    <li><strong>Not Professional Advice:</strong> The Service provides study assistance and is not a substitute for professional legal, medical, financial, or academic advice.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">3. Service Features and Limitations</h3>
                                <p>
                                    Notebook offers both Free and Pro ("Nova Pro") subscription tiers with different feature access and usage limits.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Daily Usage Limits:</strong> Free users have daily limits on AI-powered features (essay questions, grading, card generation). Pro users receive significantly higher limits. Limits reset daily at midnight UTC.</li>
                                    <li><strong>File Uploads:</strong> Free users may upload files up to 10MB. Pro users may upload files up to 45MB. Uploaded files are processed for AI card generation and must not contain copyrighted material you don't have rights to use.</li>
                                    <li><strong>Text-to-Speech (TTS):</strong> Auto-play TTS for flashcards is a Pro-exclusive feature.</li>
                                    <li><strong>Gamification:</strong> Badges, streaks, and "Concept Gems" are for engagement and motivation only. They have no monetary value and cannot be exchanged for goods or services.</li>
                                    <li><strong>Focus Timer:</strong> The Pomodoro timer feature includes audio notifications. You are responsible for managing your device's volume settings.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">4. Subscription and Billing</h3>
                                <p>
                                    Notebook offers a "Nova Pro" tier with enhanced features. By subscribing, you agree to the following:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Pricing:</strong> Nova Pro is currently priced at R59.99 per month (South African Rand). Prices are subject to change with 30 days' notice to active subscribers.</li>
                                    <li><strong>Payment Processing:</strong> Subscriptions are processed via PayFast, a South African payment gateway. By subscribing, you agree to PayFast's terms of service. We do not store your full credit card details.</li>
                                    <li><strong>Billing Cycle:</strong> Subscriptions renew automatically on a monthly basis unless canceled.</li>
                                    <li><strong>Refund Policy:</strong> Payments are non-refundable unless required by law. If you experience technical issues preventing service access, contact support for assistance.</li>
                                    <li><strong>Cancellation:</strong> You may cancel at any time via the Pricing page. Access remains active until the end of the current billing cycle.</li>
                                    <li><strong>Free Trials:</strong> New users receive one 3-day free trial of Nova Pro. Only one trial is permitted per user. Trial abuse or creating multiple accounts to access additional trials may result in account termination.</li>
                                    <li><strong>Lifetime Access:</strong> If you purchased "lifetime access" to Notebook, this grants you access to the core features available at the time of purchase. We reserve the right to modify, discontinue, or sunset features with 90 days' notice. Lifetime access does not guarantee perpetual access to third-party AI services (Google, Groq) if those partnerships end or become cost-prohibitive. In such cases, we will provide reasonable alternatives or migration options.</li>
                                    <li><strong>Service Continuity:</strong> We reserve the right to discontinue the Service entirely with 180 days' notice. In such an event, active monthly subscribers will receive a pro-rated refund for unused time. Lifetime access holders will not receive refunds but will be provided with data export tools.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">4. User Content and Conduct</h3>
                                <p>
                                    You retain ownership of the data you upload. You grant Notebook a license to process your content solely to provide and improve the Service.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>Prohibited Use:</strong> You may not use the Service to generate harmful, illegal, or deceptive content.</li>
                                    <li><strong>Academic Integrity:</strong> You agree to use the Service in compliance with your educational institution's academic integrity policies.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">6. Intellectual Property</h3>
                                <p>
                                    The Service's interface, branding, and proprietary algorithms are the property of Notebook. AI-generated outputs created for you are generally yours to use for personal educational purposes, subject to the underlying rights of third-party AI providers.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">7. Limitation of Liability</h3>
                                <p>
                                    Notebook is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service or reliance on AI outputs.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">8. Contact</h3>
                                <p>
                                    For inquiries regarding these terms, please contact: <strong>my.notebook.by.remi@gmail.com</strong>.
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
