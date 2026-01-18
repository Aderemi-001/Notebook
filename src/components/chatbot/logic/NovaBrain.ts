
import { NovaMemory } from '@/utils/NovaMemory';
import { NovaAI, NovaAIContext } from '@/utils/NovaAI';

export interface NovaContext {
    route: string;
    user: any;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    activeStudySet?: {
        id: string;
        title: string;
        description?: string;
        topCards?: { term: string; definition: string }[];
    };
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
        // Privacy: Only use first name or default to 'Student'
        const userName = context.user?.user_metadata?.full_name?.split(' ')[0] || 'Student';

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
        // 3.5 Emotional/State check (tired, stressed)
        if (lowerQuery.includes('tired') || lowerQuery.includes('exhausted') || lowerQuery.includes('sleepy') || lowerQuery.includes('burnt out')) {
            return {
                text: "It sounds like you need a break! 🌙 Rest is just as important as studying. Maybe take a 15-minute power nap or grab some water? I'll be here when you're refreshed.",
                emotion: 'neutral'
            };
        }

        // 3.6 Feature Explanations (Prevent auto-navigation for 'how does X work')
        if (lowerQuery.includes('constellation') && (lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('explain') || lowerQuery.includes('work'))) {
            return {
                text: "The **Cognitive Constellation** 🌌 is a 3D visualization of your knowledge! \n\nEach **star** represents a concept you've studied. \n• **Brightness**: Indicates your mastery level.\n• **Connections**: Lines connect related concepts.\n\nIt allows you to see your 'knowledge galaxy' grow as you learn more. Ready to explore it? Just say **'go to constellation'**! 🚀",
                emotion: 'excited'
            };
        }

        // 4. Simple navigation (exact matches & intents)
        // 4. Simple navigation (exact matches & intents)
        const navMap: Record<string, { route: string; message: string }> = {
            'dashboard': { route: '/', message: 'Taking you to the **Dashboard**! 🚀' },
            'home': { route: '/', message: 'Taking you **home**! 🏠' },
            'create set': { route: '/create', message: 'Let\'s **create a new study set**! ✨' },
            'new set': { route: '/create', message: 'Opening the **set creator**! 🆕' },
            'my sets': { route: '/sets', message: 'Here are your **study sets**! 📚' },
            'explore': { route: '/explore-public-sets', message: 'Let\'s **explore public sets**! 🌍' },
            'explore sets': { route: '/explore-public-sets', message: 'Opening **Explore Sets**! 🌍' },
            'practice quiz': { route: '/exams', message: 'Opening **Practice Quiz** mode! 📝' },
            // 'quiz' removed from strict map to allow context-aware quizzing below
            'profile': { route: '/profile', message: 'Going to your **profile**! 👤' },
            'settings': { route: '/settings', message: 'Opening **settings**! ⚙️' },
            'textbook': { route: '/textbook-finder', message: 'Opening **Textbook Finder**! 📖' },
            'finder': { route: '/textbook-finder', message: 'Heading to **Textbook Finder**! 🔍' },
            'essay': { route: '/essays', message: 'Let\'s practice some **Essays**! ✍️' },
            'essay generator': { route: '/generate-essay-questions', message: 'Opening **Essay Question Generator**! 🤖✍️' },
            'generate essay': { route: '/generate-essay-questions', message: 'Let\'s generate some **essay questions**! 📝' },
            'notes': { route: '/notebook', message: 'Opening your **Notes**! 📒' },
            'notebook': { route: '/notebook', message: 'Going to your **Notebook**! 📒' },
            'pricing': { route: '/pricing', message: 'Checking out the **Pro** plans! 💎' },
            'upgrade': { route: '/pricing', message: 'Let\'s look at **Upgrades**! 🚀' }
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

        // Special handling for 'quiz' to support context-aware inline quizzes
        if (lowerQuery.includes('quiz')) {
            // If we are looking at a set, let the AI handle it (Inline Quiz)
            if (context.activeStudySet) {
                return null; // Fall through to AI
            }
            // Otherwise, navigate to global exams
            return {
                text: "Let's head to **Quizzes**! 📝",
                action: 'navigate',
                actionTarget: '/exams',
                emotion: 'happy'
            };
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
        // Privacy: Only use first name or default to 'Student'
        const userName = context.user?.user_metadata?.full_name?.split(' ')[0] || 'Student';
        const aiContext: NovaAIContext = {
            route: context.route,
            userName,
            timeOfDay: context.timeOfDay,
            conversationHistory: context.conversationHistory || [],
            activeStudySet: context.activeStudySet
        };

        try {
            const aiResponse = await NovaAI.chat(query, aiContext);

            // Parse response for actions
            const lowerResponse = aiResponse.toLowerCase();
            let action: 'navigate' | 'search' | 'none' = 'none';
            let actionTarget: string | undefined;

            // Detect navigation intent
            if (lowerResponse.includes('go to') || lowerResponse.includes('click')) {
                if (lowerResponse.includes('practice quiz')) {
                    action = 'navigate';
                    actionTarget = '/exams';
                } else if (lowerResponse.includes('essay practice')) {
                    action = 'navigate';
                    actionTarget = '/essays';
                } else if (lowerResponse.includes('dashboard')) {
                    action = 'navigate';
                    actionTarget = '/';
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

