/**
 * NovaAI.ts
 * 
 * Hybrid AI Engine for Nova
 * Primary Provider: Groq (Llama 3 70b) - Ultra-fast LPU inference
 * Fallback Provider: Google Gemini (Flash 1.5) - High reliability & context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

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
    private static getGeminiClient() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("❌ No Google Gemini API Key found!");
            throw new Error("Missing VITE_GEMINI_API_KEY");
        }
        return new GoogleGenerativeAI(apiKey);
    }

    private static getGroqClient() {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;

        if (!apiKey) {
            console.warn("⚠️ No Groq API Key found. Skipping Groq.");
            return null;
        }
        return new Groq({ apiKey, dangerouslyAllowBrowser: true });
    }

    /**
     * Executes an AI task with automatic fallback.
     * Tries Groq first, then falls back to Gemini on error.
     */
    private static async executeWithFallback<T>(
        actionName: string,
        groqFn: (groq: Groq) => Promise<T>,
        geminiFn: (gemini: any) => Promise<T>
    ): Promise<T> {
        // 1. Try Groq (Primary)
        try {
            const groq = this.getGroqClient();
            if (groq) {
                // console.log(`🚀 [NovaAI] Trying Groq for ${actionName}...`);
                return await groqFn(groq);
            }
        } catch (error: any) {
            // Check for Rate Limits (429) or other API errors
            const isRateLimit = error?.status === 429 || error?.toString().includes('429');

            if (isRateLimit) {
                console.warn(`⚠️ [NovaAI] Groq Rate Limit Hit (429) for ${actionName}. Switching to Gemini fallback.`);
            } else {
                console.error(`❌ [NovaAI] Groq Error for ${actionName}:`, error);
                console.warn(`⚠️ [NovaAI] Switching to Gemini fallback due to error.`);
            }
        }

        // 2. Fallback to Gemini (Secondary)
        try {
            // console.log(`✨ [NovaAI] Using Gemini Fallback for ${actionName}...`);
            const gemini = this.getGeminiClient();
            return await geminiFn(gemini);
        } catch (error) {
            console.error(`❌ [NovaAI] Gemini Fallback Failed for ${actionName}:`, error);
            throw error; // If both fail, throw
        }
    }

    /**
     * AI-powered Content Extraction
     */
    public static async generateStudyContent(text: string): Promise<AIStudyContent> {
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
1. Extract up to 50 flashcards.
2. Ignore citations, headers, footers.
3. Identify top 10-20 core concepts.
4. Return ONLY raw JSON code, no markdown formatting.`;

        const userPrompt = `Analyze this content: \n\n${text.substring(0, 45000)}`;

        try {
            return await this.executeWithFallback<AIStudyContent>(
                'generateStudyContent',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    });
                    return JSON.parse(completion.choices[0]?.message?.content || "{}");
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });
                    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
                    return JSON.parse(result.response.text());
                }
            );
        } catch (e) {
            return { cards: [], concepts: [], relationships: [] };
        }
    }

    /**
     * Generates a concise definition
     */
    static async generateDefinition(term: string): Promise<string> {
        const systemPrompt = `You are a precise dictionary. Provide a specific, concise (1 sentence) definition. Plain text only. No intro.`;
        const userPrompt = `Define: "${term}"`;

        try {
            return await this.executeWithFallback<string>(
                'generateDefinition',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: "llama-3.3-70b-versatile",
                    });
                    return completion.choices[0]?.message?.content?.trim() || "";
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest" });
                    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
                    return result.response.text().trim();
                }
            );
        } catch (e) {
            return "";
        }
    }

    static async improveText(text: string, type: 'grammar' | 'flow' | 'conciseness' = 'flow'): Promise<string> {
        let systemPrompt = "You are a helpful writing assistant. Improve the following text.";
        if (type === 'grammar') systemPrompt = "Fix grammar and spelling errors. Keep the tone natural. Output only the corrected text.";
        if (type === 'flow') systemPrompt = "Improve the flow and coherence. Make it sound more professional but grounded. Output only the improved text.";
        if (type === 'conciseness') systemPrompt = "Make the text more concise and punchy. Remove fluff. Output only the shortened text.";

        try {
            return await this.executeWithFallback<string>(
                'improveText',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: text }
                        ],
                        model: "llama-3.3-70b-versatile",
                    });
                    return completion.choices[0]?.message?.content?.trim() || text;
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest" });
                    const result = await model.generateContent(systemPrompt + "\n\n" + text);
                    return result.response.text().trim();
                }
            );
        } catch (e) {
            return text;
        }
    }

    public static async chat(query: string, context: NovaAIContext): Promise<string> {
        const systemPrompt = `You are Nova, an intelligent AI assistant built into "Notebook".
Role: AI Study Assistant
Personality: Friendly, helpful, concise, encouraging.
Features: /dashboard, /sets, /create, /generate-exam (Practice Quiz), /essay-practice, /notes
Context: User=${context.userName}, Page=${context.route}
Format: Markdown. Be concise.`;

        // Prepare messages for Groq
        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...context.conversationHistory,
            { role: "user", content: query }
        ];

        try {
            return await this.executeWithFallback<string>(
                'chat',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: messages,
                        model: "llama-3.3-70b-versatile",
                    });
                    return completion.choices[0]?.message?.content || "";
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest" });
                    const chat = model.startChat({
                        history: context.conversationHistory.map(msg => ({
                            role: msg.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        })),
                        systemInstruction: systemPrompt,
                    });
                    const result = await chat.sendMessage(query);
                    return result.response.text();
                }
            );
        } catch (e) {
            console.error("Nova Chat Error:", e);
            return this.getFallbackResponse(query);
        }
    }

    /**
     * AI-powered Essay Grading
     */
    static async gradeEssay(content: string, question: string, rubric: string = 'Standard Academic'): Promise<AIEssayGrade | null> {
        const systemPrompt = `You are a professional academic grader. 
Task: Grade the provided essay based on the prompt and rubric.
Format: Return ONLY a JSON object with:
{
  "score": number (0-100),
  "letterGrade": string,
  "feedback": string,
  "contentFeedback": string[],
  "structureFeedback": string[],
  "metrics": { "readabilityScore": number, "gradeLevel": string, "vocabularyRichness": number }
}`;
        const userPrompt = `Prompt: ${question} \nRubric: ${rubric} \nEssay: ${content}`;

        try {
            return await this.executeWithFallback<AIEssayGrade | null>(
                'gradeEssay',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        model: "llama-3.3-70b-versatile",
                        response_format: { type: "json_object" }
                    });
                    return JSON.parse(completion.choices[0]?.message?.content || "null");
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });
                    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
                    return JSON.parse(result.response.text());
                }
            );
        } catch (e) {
            return null;
        }
    }

    /**
     * AI-powered Sentiment Analysis
     */
    static async analyzeSentiment(text: string): Promise<AISentimentResult> {
        const systemPrompt = `Analyze user sentiment. Return ONLY JSON: { "score": number(-5 to 5), "label": "positive"|"neutral"|"negative"|"frustrated", "encouragement": "short message" }`;

        try {
            return await this.executeWithFallback<AISentimentResult>(
                'analyzeSentiment',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: text }
                        ],
                        model: "llama-3.3-70b-versatile",
                        response_format: { type: "json_object" }
                    });
                    return JSON.parse(completion.choices[0]?.message?.content || "{}");
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });
                    const result = await model.generateContent(systemPrompt + "\n\nUser Input: " + text);
                    return JSON.parse(result.response.text());
                }
            );
        } catch (e) {
            return { score: 0, label: 'neutral', encouragement: '' };
        }
    }

    /**
     * AI-powered Spell Correction
     */
    static async correctSpelling(text: string): Promise<string> {
        const systemPrompt = `Correct spelling/grammar. Return ONLY corrected text. Maintain tone.`;

        try {
            return await this.executeWithFallback<string>(
                'correctSpelling',
                async (groq) => {
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: text }
                        ],
                        model: "llama-3.3-70b-versatile",
                    });
                    return completion.choices[0]?.message?.content?.trim() || text;
                },
                async (gemini) => {
                    const model = gemini.getGenerativeModel({ model: "gemini-flash-latest" });
                    const result = await model.generateContent(systemPrompt + "\n\n" + text);
                    return result.response.text().trim();
                }
            );
        } catch (e) {
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
