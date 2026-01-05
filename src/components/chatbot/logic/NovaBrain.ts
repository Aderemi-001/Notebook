
import { NovaMemory } from '@/utils/NovaMemory';
import { NovaAI, NovaAIContext } from '@/utils/NovaAI';

export interface NovaContext {
    route: string;
    user: any;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface NovaResponse {
    text: string;
    action?: 'navigate' | 'search' | 'none';
    actionTarget?: string;
    emotion?: 'happy' | 'neutral' | 'thinking' | 'confused' | 'excited';
}

export class NovaBrain {

    /**
     * Get time-appropriate greeting
     */
    private static getGreeting(time: string, name: string): string {
        const greetings = {
            morning: ["Good morning", "Rise and shine", "Ready to start the day"],
            afternoon: ["Good afternoon", "Hope your day is going well", "Powering through the afternoon"],
            evening: ["Good evening", "Winding down", "Evening study session"],
            late_night: ["Burning the midnight oil", "Wow, you're up late", "Late night inspiration"]
        };
        const options = greetings[time as keyof typeof greetings] || greetings.morning;
        return `${options[Math.floor(Math.random() * options.length)]}, ${name}!`;
    }

    /**
     * Handle simple queries locally (no API call needed)
     */
    private static async handleLocalQuery(query: string, context: NovaContext): Promise<NovaResponse | null> {
        // Normalize: lowercase and remove punctuation (keeping alphanumeric and spaces)
        const lowerQuery = query.toLowerCase().replace(/[?!.,]/g, '').trim();
        const userName = context.user?.user_metadata?.full_name?.split(' ')[0] || 'friend';

        // 1. Greetings
        if (['hi', 'hello', 'hey', 'start', 'sup', 'yo', 'how are you', "how's it going", 'how are you doing'].includes(lowerQuery)) {
            return {
                text: `${this.getGreeting(context.timeOfDay, userName)} 🌟 I'm doing great and ready to help you study! What are we focusing on today?`,
                emotion: 'happy'
            };
        }

        // 2. Identity & Capability questions
        if (lowerQuery.includes('who are you') || lowerQuery.includes('what are you') || lowerQuery.includes('what can you do') || lowerQuery.includes('how can you help')) {
            return {
                text: "I'm **Nova**, your AI study assistant! 🧠 I can help you **create study sets**, find specific **flashcards**, generate **practice quizzes**, and even **grade your essays**. What would you like to explore first?",
                emotion: 'happy'
            };
        }

        // 3. Help / How to use
        if (lowerQuery.includes('help') || lowerQuery.includes('how to use') || lowerQuery.includes('tutorial') || lowerQuery.includes('instructions')) {
            return {
                text: "I'm here to make learning easier! 🌟 You can:\n\n1. **Create a Set**: Use the '+' button to manually add cards or import files (PDF, Word).\n2. **Study**: Open any set to use flashcards with spaced repetition.\n3. **Quiz**: Navigate to **Practice Quiz** to test your knowledge.\n4. **Essay**: Use **Essay Practice** to get AI-powered feedback on your writing.\n\nJust type a feature name (like 'Quiz') and I'll take you there!",
                emotion: 'happy'
            };
        }

        // 3. Contextual suggestions
        if (lowerQuery.includes('what should i do') || lowerQuery.includes('suggest something')) {
            const dueCards = await NovaMemory.getCardsDueToday(context.user.id);

            if (dueCards.length > 0) {
                return {
                    text: `I see you have **${dueCards.length} cards** due for review! Let's tackle them. 🧠`,
                    action: 'navigate',
                    actionTarget: '/daily-review',
                    emotion: 'excited'
                };
            } else {
                return {
                    text: "You're all caught up on reviews! 🎉 Maybe **create a new study set** or take a **practice quiz**?",
                    emotion: 'happy'
                };
            }
        }

        // 4. Simple navigation (exact matches)
        const navMap: Record<string, { route: string; message: string }> = {
            'dashboard': { route: '/dashboard', message: 'Taking you to the **Dashboard**! 🚀' },
            'home': { route: '/dashboard', message: 'Taking you **home**! 🏠' },
            'create set': { route: '/create', message: 'Let\'s **create a new study set**! ✨' },
            'my sets': { route: '/sets', message: 'Here are your **study sets**! 📚' },
            'quiz': { route: '/generate-exam', message: 'Ready for a **quiz**? Let\'s test your knowledge! 📝' },
            'profile': { route: '/profile', message: 'Going to your **profile**! 👤' },
            'settings': { route: '/settings', message: 'Opening **settings**! ⚙️' }
        };

        for (const [keyword, nav] of Object.entries(navMap)) {
            if (lowerQuery.includes(keyword)) {
                return {
                    text: nav.message,
                    action: 'navigate',
                    actionTarget: nav.route,
                    emotion: 'happy'
                };
            }
        }

        // No local match - use AI
        return null;
    }

    static async processQuery(query: string, context: NovaContext): Promise<NovaResponse> {
        // Try local handling first (fast, no API call)
        const localResponse = await this.handleLocalQuery(query, context);
        if (localResponse) {
            return localResponse;
        }

        // Complex query - use AI
        const userName = context.user?.user_metadata?.full_name?.split(' ')[0] || 'friend';
        const aiContext: NovaAIContext = {
            route: context.route,
            userName,
            timeOfDay: context.timeOfDay,
            conversationHistory: context.conversationHistory || []
        };

        try {
            const aiResponse = await NovaAI.getResponse(query, aiContext);

            // Parse response for actions
            const lowerResponse = aiResponse.toLowerCase();
            let action: 'navigate' | 'search' | 'none' = 'none';
            let actionTarget: string | undefined;

            // Detect navigation intent
            if (lowerResponse.includes('go to') || lowerResponse.includes('click')) {
                if (lowerResponse.includes('practice quiz')) {
                    action = 'navigate';
                    actionTarget = '/generate-exam';
                } else if (lowerResponse.includes('essay practice')) {
                    action = 'navigate';
                    actionTarget = '/essay-practice';
                } else if (lowerResponse.includes('dashboard')) {
                    action = 'navigate';
                    actionTarget = '/dashboard';
                } else if (lowerResponse.includes('my sets')) {
                    action = 'navigate';
                    actionTarget = '/sets';
                }
            }

            // Detect search intent
            if (lowerResponse.includes('searching') || query.toLowerCase().startsWith('search')) {
                action = 'search';
                actionTarget = query.replace(/search(ing)?\s+(for\s+)?/i, '').trim();
            }

            return {
                text: aiResponse,
                action,
                actionTarget,
                emotion: 'happy'
            };

        } catch (error) {
            console.error('Nova AI Error:', error);

            return {
                text: "I'm having trouble connecting right now, but I'm here to help! Try asking about creating sets, taking quizzes, or managing your notes. 🌟",
                emotion: 'neutral'
            };
        }
    }
}

