/**
 * NovaAI.ts
 * 
 * AI-powered conversational intelligence for Nova
 * Uses Google Gemini API for fast, free, intelligent responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

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
    private static getClient() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("❌ No Google Gemini API Key found!");
            throw new Error("Missing VITE_GEMINI_API_KEY");
        }

        return new GoogleGenerativeAI(apiKey);
    }

    /**
     * AI-powered Content Extraction (Gemini)
     * Using Gemini 1.5 Flash for massive context and high limits
     */
    public static async generateStudyContent(text: string, fileName: string): Promise<AIStudyContent> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001", generationConfig: { responseMimeType: "application/json" } });

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

            const prompt = `${systemPrompt}\n\nAnalyze this content: \n\n${text.substring(0, 45000)}`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            if (!responseText) return { cards: [], concepts: [], relationships: [] };

            const response = JSON.parse(responseText);
            return {
                cards: response.cards || [],
                concepts: response.concepts || [],
                relationships: response.relationships || []
            };

        } catch (error) {
            console.error('Gemini Content Generation Error:', error);
            return { cards: [], concepts: [], relationships: [] };
        }
    }

    /**
     * Generates a concise definition for a single term.
     */
    static async generateDefinition(term: string): Promise<string> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are a precise dictionary. Provide a specific, concise (1 sentence) definition. Plain text only. No intro.\n\nDefine: "${term}"`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error("Nova Definition Error:", error);
            return "";
        }
    }

    static async improveText(text: string, type: 'grammar' | 'flow' | 'conciseness' = 'flow'): Promise<string> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

            let systemPrompt = "You are a helpful writing assistant. Improve the following text.";
            if (type === 'grammar') systemPrompt = "Fix grammar and spelling errors. Keep the tone natural. Output only the corrected text.";
            if (type === 'flow') systemPrompt = "Improve the flow and coherence. Make it sound more professional but grounded. Output only the improved text.";
            if (type === 'conciseness') systemPrompt = "Make the text more concise and punchy. Remove fluff. Output only the shortened text.";

            const prompt = `${systemPrompt}\n\n${text}`;
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error("Nova Improve Error:", error);
            return text;
        }
    }

    public static async chat(query: string, context: NovaAIContext): Promise<string> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

            const systemPrompt = `You are Nova, an intelligent AI assistant built into "Notebook" - a smart study application.

## YOUR IDENTITY
- Name: Nova
- Role: AI Study Assistant
- Personality: Friendly, helpful, concise, encouraging
- Emoji usage: 1-2 per response maximum

## APP FEATURES & NAVIGATION
1. **Dashboard** (/dashboard) - Stats, streak, quick actions
2. **My Sets** (/sets) - Create, edit, delete sets
3. **Create Set** (/create) - Manual or File Import (PDF/PPT)
4. **Practice Quiz** (/generate-exam) - AI generated quizzes
5. **Essay Practice** (/essay-practice) - AI grading
6. **Daily Review** (/daily-review) - Spaced repetition
7. **My Notes** (/notes) - Linked notes & handwriting
8. **Profile** (/profile) - Stats & settings
9. **Settings** (/settings) - Theme & preferences

## HOW TO HELP USERS
- Be concise.
- Use **bold** for feature names.
- Provide step-by-step help.
- Never invent features.

## CURRENT CONTEXT
- User: ${context.userName}
- Time: ${context.timeOfDay}
- Current page: ${context.route}`;

            // Combine history and new query into a chat structure
            const chat = model.startChat({
                history: context.conversationHistory.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                })),
                systemInstruction: systemPrompt,
            });

            console.log('🚀 Calling Gemini API...');
            const result = await chat.sendMessage(query);
            console.log('✅ Gemini API response received!');

            return result.response.text();

        } catch (error) {
            console.error('❌ Nova AI Error (Gemini):', error);
            return this.getFallbackResponse(query);
        }
    }

    /**
     * AI-powered Essay Grading
     */
    static async gradeEssay(content: string, question: string, rubric: string = 'Standard Academic'): Promise<AIEssayGrade | null> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001", generationConfig: { responseMimeType: "application/json" } });

            const systemPrompt = `You are a professional academic grader. 
Task: Grade the provided essay based on the prompt and rubric.
Format: Return ONLY a JSON object with:
- score: number (0-100)
- letterGrade: string (A, B, C, D, F)
- feedback: string (short encouraging summary)
- contentFeedback: string[] (specific observations on content)
- structureFeedback: string[] (feedback on flow/organization)
- metrics: { readabilityScore, gradeLevel, vocabularyRichness }`;

            const prompt = `${systemPrompt}\n\nPrompt: ${question} \nRubric: ${rubric} \nEssay: ${content}`;

            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text()) as AIEssayGrade;
        } catch (error) {
            console.error('Gemini Grading Error:', error);
            return null;
        }
    }

    /**
     * AI-powered Sentiment Analysis
     */
    static async analyzeSentiment(text: string): Promise<AISentimentResult> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001", generationConfig: { responseMimeType: "application/json" } });

            const systemPrompt = `Analyze user sentiment. Return ONLY JSON:
            { "score": number(-5 to 5), "label": "positive" | "neutral" | "negative" | "frustrated", "encouragement": "short message" }`;

            const prompt = `${systemPrompt}\n\nUser Input: ${text}`;
            const result = await model.generateContent(prompt);

            return JSON.parse(result.response.text()) as AISentimentResult;
        } catch (error) {
            console.error('Gemini Sentiment Error:', error);
            return { score: 0, label: 'neutral', encouragement: '' };
        }
    }

    /**
     * AI-powered Spell Correction
     */
    static async correctSpelling(text: string): Promise<string> {
        try {
            const genAI = this.getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

            const prompt = `Correct spelling/grammar. Return ONLY corrected text. Maintain tone.\n\n${text}`;
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error('Gemini Spell Error:', error);
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
