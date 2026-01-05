/**
 * NovaAI.ts
 * 
 * AI-powered conversational intelligence for Nova
 * Uses Groq API for fast, intelligent responses
 */

import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    dangerouslyAllowBrowser: true // Allow client-side usage
});

export interface NovaAIContext {
    route: string;
    userName: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIExtractedCard {
    term: string;
    definition: string;
}

export interface AIEssayGrade {
    score: number;
    letterGrade: string;
    feedback: string;
    contentFeedback: string[];
    structureFeedback: string[];
    metrics: {
        readabilityScore: number;
        gradeLevel: string;
        vocabularyRichness: number;
    };
}

export interface AISentimentResult {
    score: number;
    label: 'positive' | 'neutral' | 'negative' | 'frustrated';
    encouragement: string;
}

export interface AIExtractedConcept {
    name: string;
    description: string;
}

export interface AIExtractedRelationship {
    source_name: string;
    target_name: string;
    type: string;
    strength: number;
}

export interface AIStudyContent {
    cards: AIExtractedCard[];
    concepts: AIExtractedConcept[];
    relationships: AIExtractedRelationship[];
}

export class NovaAI {
    static async getResponse(query: string, context: NovaAIContext): Promise<string> {
        try {
            // Debug: Check if API key is loaded
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                console.error('❌ GROQ API KEY NOT FOUND! Check .env.local');
                return this.getFallbackResponse(query);
            }

            console.log('✅ Groq API Key loaded, length:', apiKey.length);

            // Build comprehensive system prompt with app knowledge
            const systemPrompt = `You are Nova, an intelligent AI assistant built into "Notebook" - a smart study application.

## YOUR IDENTITY
- Name: Nova
- Role: AI Study Assistant
- Personality: Friendly, helpful, concise, encouraging
- Emoji usage: 1-2 per response maximum

## APP FEATURES & NAVIGATION

### Core Features:
1. **Dashboard** (/dashboard)
   - Overview of study stats, recent sets, quick actions
   - Shows study streak, mastered cards, daily progress

2. **My Sets** (/sets)
   - User's personal study set library
   - Can create, edit, delete, and organize sets
   - Each set contains flashcards (term + definition)

3. **Create Set** (/create)
   - Manual card creation OR file import
   - **Nova File Import**: Upload PDF, Word, PPT files
   - AI extracts terms/definitions automatically
   - Supports spell-check, keyword extraction, math detection

4. **Practice Quiz** (/generate-exam)
   - AI-generated multiple-choice questions
   - Based on user's study sets
   - Customizable question count and types

5. **Essay Practice** (/essay-practice)
   - Write essays on study topics
   - AI grades essays on Content, Structure, Readability
   - Provides letter grade and detailed feedback

6. **Daily Review** (/daily-review)
   - Spaced Repetition System (SM-2 algorithm)
   - Shows cards due for review today
   - "Again", "Hard", "Good", "Easy" buttons
   - Adaptive learning curve

7. **My Notes** (/notes)
   - Free-form note-taking
   - Handwriting mode available
   - Can link notes to study sets

8. **Profile** (/profile)
   - User stats, study streak
   - Account management

9. **Settings** (/settings)
   - Theme (dark/light mode)
   - Study preferences (flashcard side, daily goals)
   - Exam generation defaults
   - Legal documents (Terms, Privacy Policy)

### Advanced Features:
- **Cognitive Constellation**: Visual concept mapping (coming soon)
- **Spaced Repetition**: Smart review scheduling based on performance
- **AI Intelligence Modules**:
  - NovaMemory: Tracks learning curves
  - NovaSentiment: Detects frustration, provides encouragement
  - NovaKeywords: Extracts key concepts (TF-IDF)
  - NovaSpellCheck: Auto-corrects typos
  - NovaMath: Detects equations, creates math flashcards

## HOW TO HELP USERS

### Deletion Instructions:
- **Delete Study Set**: Find set on Dashboard/My Sets → click trash icon 🗑️
- **Delete Essay**: Go to Essay Practice → find essay in history → click delete button
- **Delete Note**: My Notes → select note → click trash icon in header
- **Delete Card**: Open set → click trash icon next to card

### Navigation:
- Use **bold** for feature names (e.g., **Dashboard**, **Practice Quiz**)
- Provide direct routes when helpful
- Keep instructions step-by-step and concise

### Study Tips:
- Encourage spaced repetition for long-term retention
- Suggest active recall over passive reading
- Recommend practice quizzes before exams

## CURRENT CONTEXT
- User: ${context.userName}
- Time: ${context.timeOfDay}
- Current page: ${context.route}

## RESPONSE GUIDELINES
1. Be concise (under 100 words unless explaining complex features)
2. Use **bold** for emphasis on feature names
3. Provide step-by-step instructions for "how to" questions
4. If unsure, admit limitations honestly
5. Encourage users and celebrate progress
6. Never make up features that don't exist
7. For deletion requests, always warn that it's permanent`;

            // Build conversation history
            const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...context.conversationHistory.slice(-6), // Last 6 messages for context
                { role: 'user', content: query }
            ];

            console.log('🚀 Calling Groq API...');

            // Call Groq API
            const completion = await groq.chat.completions.create({
                messages,
                model: 'llama-3.1-8b-instant', // Switch to 8b due to 70b rate limits
                temperature: 0.7,
                max_tokens: 200,
                top_p: 1,
            });

            console.log('✅ Groq API response received!');
            return completion.choices[0]?.message?.content || "I'm having trouble processing that. Could you rephrase?";

        } catch (error) {
            console.error('❌ Nova AI Error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Fallback to local response
            return this.getFallbackResponse(query);
        }
    }

    /**
     * Generates a concise definition for a single term.
     * Optimized for minimal token usage.
     */
    static async generateDefinition(term: string): Promise<string> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a precise dictionary. Provide a specific, concise (1 sentence) definition. Plain text only. No intro."
                    },
                    {
                        role: "user",
                        content: `Define: "${term}"`
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
                max_tokens: 60,
            });

            return completion.choices[0]?.message?.content?.trim() || "";
        } catch (error) {
            console.error("Nova Definition Error:", error);
            return "";
        }
    }

    static async improveText(text: string, type: 'grammar' | 'flow' | 'conciseness' = 'flow'): Promise<string> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            let systemPrompt = "You are a helpful writing assistant. Improve the following text.";
            if (type === 'grammar') systemPrompt = "Fix grammar and spelling errors. Keep the tone natural. Output only the corrected text.";
            if (type === 'flow') systemPrompt = "Improve the flow and coherence. Make it sound more professional but grounded. Output only the improved text.";
            if (type === 'conciseness') systemPrompt = "Make the text more concise and punchy. Remove fluff. Output only the shortened text.";

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.4,
                max_tokens: 1000,
            });

            return completion.choices[0]?.message?.content?.trim() || text;
        } catch (error) {
            console.error("Nova Improve Error:", error);
            return text; // Return original on error to be safe
        }
    }



    /**
     * AI-powered Content Extraction (Groq)
     * Extracts:
    * 1. Flashcards (Terms & Definitions)
    * 2. Key Concepts (Nodes)
    * 3. Concept Relationships (Edges) - For Cognitive Constellation
    */
    static async generateStudyContent(text: string): Promise<AIStudyContent> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            const systemPrompt = `You are an expert educational content creator.
Task: Deeply analyze the provided text to create a comprehensive study graph.
Output: Return ONLY a valid JSON object.
Structure:
{
  "cards": [ { "term": "Exact Term", "definition": "Precise definition from text" } ],
  "concepts": [ { "name": "Concept Name", "description": "Brief summary of the concept" } ],
  "relationships": [ { "source_name": "Concept A", "target_name": "Concept B", "type": "causes/part_of/related_to", "strength": 0.1-1.0 } ]
}

Guidelines:
1. MAXIMIZE CARDS: Extract as many valid flashcards as possible (up to 50).
2. STRICT CLEANUP: IGNORE headers, footers, page numbers, citations (e.g., "[1]", "(Smith, 2020)"), and references sections.
3. QUALITY OVER QUANTITY: Ensure "term" is a concept/question and "definition" is a complete answer/explanation. Avoid sentence fragments.
4. CONCEPTS: Identify the top 10-20 core topics or entities.
5. RELATIONSHIPS: Connect the concepts logically to form a knowledge graph.
6. NO CITATION GARBAGE: Do not create cards for "[Online] Available at" or similar metadata.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze this content: \n\n${text.substring(0, 45000)}` }
                ],
                model: 'llama-3.1-8b-instant',
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 6000,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) return { cards: [], concepts: [], relationships: [] };

            const response = JSON.parse(content);
            return {
                cards: response.cards || [],
                concepts: response.concepts || [],
                relationships: response.relationships || []
            };

        } catch (error) {
            console.error('Groq Content Generation Error:', error);
            // Fallback: return empty structure
            return { cards: [], concepts: [], relationships: [] };
        }
    }

    /**
     * AI-powered Essay Grading
     * Provides professional, nuanced feedback
     */
    static async gradeEssay(content: string, question: string, rubric: string = 'Standard Academic'): Promise<AIEssayGrade | null> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            const systemPrompt = `You are a professional academic grader. 
Task: Grade the provided essay based on the prompt and rubric.
Format: Return ONLY a JSON object with:
- score: number (0-100)
- letterGrade: string (A, B, C, D, F)
- feedback: string (short encouraging summary)
- contentFeedback: string[] (specific observations on content)
- structureFeedback: string[] (feedback on flow/organization)
- metrics: { readabilityScore, gradeLevel, vocabularyRichness }`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Prompt: ${question} \nRubric: ${rubric} \nEssay: ${content} ` }
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.5,
            });

            return JSON.parse(completion.choices[0]?.message?.content || '{}') as AIEssayGrade;
        } catch (error) {
            console.error('Groq Grading Error:', error);
            return null;
        }
    }

    /**
     * AI-powered Sentiment Analysis
     * Detects emotional nuances and frustration
     */
    static async analyzeSentiment(text: string): Promise<AISentimentResult> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            const systemPrompt = `Analyze user sentiment. Return ONLY JSON:
            { "score": number(-5 to 5), "label": "positive" | "neutral" | "negative" | "frustrated", "encouragement": "short message" }`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.5,
            });

            return JSON.parse(completion.choices[0]?.message?.content || '{}') as AISentimentResult;
        } catch (error) {
            console.error('Groq Sentiment Error:', error);
            return { score: 0, label: 'neutral', encouragement: '' };
        }
    }

    /**
     * AI-powered Spell Correction
     * Context-aware correction
     */
    static async correctSpelling(text: string): Promise<string> {
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API key missing');

            const systemPrompt = `Correct spelling/grammar. Return ONLY corrected text. Maintain tone.`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
            });

            return completion.choices[0]?.message?.content || text;
        } catch (error) {
            console.error('Groq Spell Error:', error);
            return text;
        }
    }

    /**
     * Fallback response when API fails
     */
    private static getFallbackResponse(query: string): string {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('delete')) {
            return "To delete items, look for the **trash icon** (🗑️) next to the item. Note: Deletions are permanent!";
        }

        if (lowerQuery.includes('create') || lowerQuery.includes('new')) {
            return "Click **+ Create Set** in the sidebar to create new study materials!";
        }

        if (lowerQuery.includes('quiz') || lowerQuery.includes('test')) {
            return "Go to **Practice Quiz** to test yourself with AI-generated questions!";
        }

        return "I'm currently offline, but I can still help! Try asking about specific features like creating sets, taking quizzes, or managing your notes.";
    }
}
