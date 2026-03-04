import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { demoSteps } from './demoSteps';
import { supabase } from '@/integrations/supabase/client';
import { usePomodoro } from '@/contexts/PomodoroContext';

export const DemoController: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [stepIndex, setStepIndex] = useState(0);
    const { updateWorkTime, setSoundEnabled } = usePomodoro();
    const [isDemoActive, setIsDemoActive] = useState(false);

    // Initialize demo state from URL
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('demo') === '1') {
            setIsDemoActive(true);
        }
    }, [location.search]);

    useEffect(() => {
        if (!isDemoActive) return;

        const currentStep = demoSteps[stepIndex];
        if (!currentStep) return;

        console.log(`🎬 Demo Step ${stepIndex}: ${currentStep.id} - ${currentStep.description}`);

        const executeStep = async () => {
            // Action Logic
            switch (currentStep.action) {
                case 'navigate':
                    if (currentStep.target) {
                        // Ensure we keep the demo param
                        const targetUrl = currentStep.target.includes('?')
                            ? `${currentStep.target}&demo=1`
                            : `${currentStep.target}?demo=1`;
                        navigate(targetUrl);
                    }
                    break;

                case 'type':
                    if (currentStep.target && currentStep.value) {
                        const input = document.querySelector(currentStep.target) as HTMLInputElement;
                        if (input) {
                            // Focus and highlight
                            input.focus();
                            input.style.transition = 'all 0.3s';
                            input.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.5)';

                            // Simulate typing
                            const text = currentStep.value;
                            for (let i = 0; i <= text.length; i++) {
                                // React 18 state updates batching might need native setter hacking
                                const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                                valueSetter?.call(input, text.slice(0, i));
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                await new Promise(r => setTimeout(r, 50 + Math.random() * 30)); // Human-like typing
                            }

                            // Remove highlight
                            setTimeout(() => {
                                input.style.boxShadow = '';
                            }, 500);
                        } else {
                            console.warn(`Target not found: ${currentStep.target}`);
                        }
                    }
                    break;

                case 'click':
                    if (currentStep.target) {
                        let el: HTMLElement | null = null;

                        // Support for :contains() pseudo-selector
                        if (currentStep.target.includes(':contains("')) {
                            const text = currentStep.target.match(/:contains\("([^"]+)"\)/)?.[1];
                            const baseSelector = currentStep.target.split(':contains')[0];
                            if (text) {
                                const elements = document.querySelectorAll(baseSelector || '*');
                                el = Array.from(elements).find(e => e.textContent?.includes(text)) as HTMLElement;
                            }
                        } else {
                            el = document.querySelector(currentStep.target) as HTMLElement;
                        }

                        if (el) {
                            // Highlight before click
                            const originalTransform = el.style.transform;
                            el.style.transition = 'all 0.3s';
                            el.style.transform = 'scale(0.95)';
                            el.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.5)';

                            await new Promise(r => setTimeout(r, 300)); // Visual pause

                            el.click();

                            // Reset
                            setTimeout(() => {
                                if (el) {
                                    el.style.transform = originalTransform;
                                    el.style.boxShadow = '';
                                }
                            }, 300);
                        } else {
                            console.warn(`Target not found: ${currentStep.target}`);
                        }
                    }
                    break;

                case 'custom':
                    // Handle special logic
                    if (currentStep.value === 'set-timer-5s') {
                        console.log("Custom action: Setting timer to 5s");
                        updateWorkTime(5 / 60); // 5 seconds
                    }
                    if (currentStep.value === 'set-sound-on') {
                        setSoundEnabled(true);
                    }
                    if (currentStep.value === 'logout') {
                        await supabase.auth.signOut();
                        navigate('/login?demo=1');
                    }

                    // Terminal specific actions
                    if (currentStep.value === 'terminal-enter') {
                        const input = document.querySelector('.terminal-input') as HTMLInputElement;
                        if (input) {
                            const event = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            input.dispatchEvent(event);
                        }
                    }

                    if (currentStep.value === 'terminal-scroll') {
                        const consoleEl = document.querySelector('.terminal-console') || document.querySelector('.space-y-1.font-mono');
                        if (consoleEl) {
                            consoleEl.scrollTo({ top: consoleEl.scrollHeight, behavior: 'smooth' });
                        }
                    }

                    // Highlight logic
                    if (currentStep.value?.startsWith('highlight:')) {
                        const selector = currentStep.value.split(':')[1];
                        const el = document.querySelector(selector) as HTMLElement;
                        if (el) {
                            const originalBoxShadow = el.style.boxShadow;
                            const originalTransform = el.style.transform;

                            el.style.transition = 'all 0.5s ease';
                            el.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.6)'; // Purple glow
                            el.style.transform = 'scale(1.05)';

                            setTimeout(() => {
                                el.style.boxShadow = originalBoxShadow;
                                el.style.transform = originalTransform;
                            }, currentStep.duration ? currentStep.duration - 200 : 1000);
                        }
                    }

                    // Click by text content
                    if (currentStep.value?.startsWith('click-text:')) {
                        const text = currentStep.value.split(':')[1];
                        // XPath to find element by text
                        const xpath = `//*[contains(text(), '${text}')]`;
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        const node = result.singleNodeValue as HTMLElement;

                        if (node) {
                            node.click();
                        } else {
                            // Fallback: Try to find any card if specific one fails
                            const fallback = document.querySelector('[data-testid="study-set-card"]');
                            (fallback as HTMLElement)?.click();
                        }
                    }

                    // Camera Zoom Logic
                    if (currentStep.value?.startsWith('zoom:')) {
                        // Format: "zoom:scale" (reset) or "zoom:scale:selector"
                        const parts = currentStep.value.split(':');
                        const scale = parseFloat(parts[1]);
                        const selector = parts.slice(2).join(':'); // Rejoin in case selector has colons

                        const root = document.getElementById('root');
                        if (root) {
                            root.style.transition = 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform-origin 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';

                            if (scale === 1 || !selector) {
                                // Reset
                                root.style.transform = 'scale(1)';
                                root.style.transformOrigin = 'center center';
                            } else {
                                const target = document.querySelector(selector);
                                if (target) {
                                    const rect = target.getBoundingClientRect();
                                    const centerX = rect.left + rect.width / 2;
                                    const centerY = rect.top + rect.height / 2;

                                    // Set origin to the target element's center
                                    root.style.transformOrigin = `${centerX}px ${centerY}px`;
                                    root.style.transform = `scale(${scale})`;
                                }
                            }
                        }
                    }

                    // Simulate File Upload
                    if (currentStep.value === 'simulate-file-upload') {
                        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                        if (fileInput) {
                            // Create a dummy file
                            const file = new File(['dummy content'], 'Notebook App User Guide.pdf', { type: 'application/pdf' });
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            fileInput.files = dataTransfer.files;

                            // Visual feedback
                            fileInput.style.transition = 'box-shadow 0.3s';
                            fileInput.style.boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.6)';

                            // Trigger change
                            fileInput.dispatchEvent(new Event('change', { bubbles: true }));

                            await new Promise(r => setTimeout(r, 500));
                            fileInput.style.boxShadow = '';
                        }
                    }

                    // Draw Doodle (High FPS)
                    if (currentStep.value === 'draw-doodle') {
                        const canvas = document.querySelector('canvas');
                        if (canvas) {
                            const rect = canvas.getBoundingClientRect();
                            const sendEvent = (type: string, x: number, y: number) => {
                                const evt = new PointerEvent(type, {
                                    bubbles: true,
                                    clientX: rect.left + x,
                                    clientY: rect.top + y,
                                    pointerType: 'pen',
                                    pressure: 0.5
                                });
                                canvas.dispatchEvent(evt);
                            };

                            // Draw a smooth wave (300 frames)
                            // Start point
                            const startX = 200;
                            const startY = 300;
                            sendEvent('pointerdown', startX, startY);

                            // 350 frames for maximum smoothness
                            for (let i = 0; i < 350; i++) {
                                await new Promise(r => setTimeout(r, 4)); // ~60fps target
                                // Organic sine wave
                                const x = startX + i * 0.8;
                                const y = startY + Math.sin(i * 0.05) * 60;
                                sendEvent('pointermove', x, y);
                            }
                            sendEvent('pointerup', startX + 350 * 0.8, startY);
                        }
                    }

                    // Handwrite text on canvas
                    if (currentStep.value?.startsWith('handwrite-text:')) {
                        const text = currentStep.value.split(':').slice(1).join(':');
                        const canvas = document.querySelector('canvas');

                        if (canvas) {
                            const rect = canvas.getBoundingClientRect();
                            const sendEvent = (type: string, x: number, y: number) => {
                                const evt = new PointerEvent(type, {
                                    bubbles: true,
                                    clientX: rect.left + x,
                                    clientY: rect.top + y,
                                    pointerType: 'pen',
                                    pressure: 0.5
                                });
                                canvas.dispatchEvent(evt);
                            };

                            // Handwrite starting at a lower position
                            const startX = 250;
                            const startY = 450;
                            sendEvent('pointerdown', startX, startY);

                            // Draw each character with slight pause between
                            const charDelay = 100;
                            for (let char = 0; char < text.length; char++) {
                                // Simulate character drawing
                                for (let stroke = 0; stroke < 20; stroke++) {
                                    await new Promise(r => setTimeout(r, 5));
                                    const x = startX + char * 40 + stroke * 2;
                                    const y = startY + Math.sin(stroke * 0.3) * 10;
                                    sendEvent('pointermove', x, y);
                                }
                                await new Promise(r => setTimeout(r, charDelay));
                            }
                            sendEvent('pointerup', startX + text.length * 40, startY);
                        }
                    }

                    // Link note to set (immediate selection + close)
                    if (currentStep.value?.startsWith('link-note-to-set:')) {
                        const setName = currentStep.value.split(':').slice(1).join(':');

                        // Dialog is already open from previous click
                        // XPath to find the set option
                        const xpath = `//*[contains(text(), '${setName}')]`;
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        const node = result.singleNodeValue as HTMLElement;

                        if (node) {
                            node.click();
                        }
                    }
                    break;
            }

            // Schedule next step
            setTimeout(() => {
                setStepIndex(prev => prev + 1);
            }, currentStep.duration || 1000);
        };

        // Add a small delay before executing action to let page load
        const initTimeout = setTimeout(executeStep, 500);

        return () => clearTimeout(initTimeout);

    }, [stepIndex, isDemoActive, navigate]); // Added isDemoActive

    // Render a small overlay to show demo mode is active
    if (!isDemoActive) return null;

    const exitDemo = () => {
        setIsDemoActive(false);
        // Remove demo param from URL without refreshing
        const url = new URL(window.location.href);
        url.searchParams.delete('demo');
        window.history.replaceState({}, '', url.toString());
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white px-4 py-2 rounded-full text-xs font-mono flex items-center gap-3 border border-white/20 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>DEMO: Step {stepIndex + 1}/{demoSteps.length}</span>
            </div>
            <button
                onClick={exitDemo}
                className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-white/10 transition-colors uppercase tracking-tighter font-bold"
            >
                Exit
            </button>
        </div>
    );
};
