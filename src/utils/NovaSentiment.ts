/**
 * NovaSentiment.ts
 * 
 * Sentiment Analysis & Emotional Intelligence
 * Detects user frustration and provides encouragement
 */

import Sentiment from 'sentiment';
import { NovaAI } from './NovaAI';

const sentiment = new Sentiment();

export interface EmotionalState {
    score: number; // -5 (very negative) to +5 (very positive)
    comparative: number; // normalized score
    isPositive: boolean;
    isNegative: boolean;
    isNeutral: boolean;
}

export class NovaSentiment {

    /**
     * Analyze text sentiment
     */
    static analyzeText(text: string): EmotionalState {
        const result = sentiment.analyze(text);

        return {
            score: result.score,
            comparative: result.comparative,
            isPositive: result.score > 0,
            isNegative: result.score < 0,
            isNeutral: result.score === 0
        };
    }

    /**
     * Detect frustration based on performance streak
     * @param wrongStreak - Number of consecutive wrong answers
     */
    static detectFrustration(wrongStreak: number): {
        isFrustrated: boolean;
        message: string;
    } {
        if (wrongStreak >= 5) {
            return {
                isFrustrated: true,
                message: "Hey, I notice you're struggling. That's completely normal! 🌟 Take a 5-minute break, grab some water, and come back fresh. You've got this!"
            };
        } else if (wrongStreak >= 3) {
            return {
                isFrustrated: true,
                message: "You're doing great, just need to reset! 💪 Remember, mistakes are how we learn. Keep going!"
            };
        }

        return {
            isFrustrated: false,
            message: ""
        };
    }

    /**
     * Generate encouraging message based on performance
     */
    static getEncouragingMessage(correctStreak: number, wrongStreak: number): string {
        if (correctStreak >= 10) {
            return "🔥 You're on fire! " + correctStreak + " in a row! Keep this momentum going!";
        } else if (correctStreak >= 5) {
            return "✨ Great job! You're really getting the hang of this!";
        } else if (wrongStreak >= 3) {
            return "💙 Take a breath. You're learning, and that's what matters. One step at a time!";
        } else if (correctStreak >= 3) {
            return "🌟 Nice work! You're building solid knowledge!";
        }

        return "";
    }

    /**
     * Analyze user's study session mood
     * Based on time of day and performance
     */
    static getSessionMood(
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night',
        avgPerformance: number // 0-100%
    ): string {
        if (timeOfDay === 'late_night' && avgPerformance < 50) {
            return "Late night studying can be tough! 🌙 Consider reviewing these cards again tomorrow when you're fresh.";
        } else if (timeOfDay === 'morning' && avgPerformance > 80) {
            return "Morning brain is working perfectly! ☀️ You're crushing it!";
        } else if (avgPerformance > 90) {
            return "Incredible performance! 🎯 You've mastered this material!";
        } else if (avgPerformance < 40) {
            return "This material is challenging, but you're making progress! 💪 Every review makes you stronger.";
        }

        return "You're doing well! Keep up the good work! 🌟";
    }

    /**
     * Context-aware AI encouragement (Groq)
     */
    static async getEncouragementWithAI(text: string): Promise<string> {
        try {
            const aiResult = await NovaAI.analyzeSentiment(text);
            return aiResult.encouragement;
        } catch (error) {
            return "Keep going, you're doing great! 🌟";
        }
    }
}
