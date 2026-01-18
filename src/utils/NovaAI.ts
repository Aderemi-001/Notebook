/**
 * NovaAI.ts
 * 
 * Hybrid AI Engine for Nova
 * Primary Provider: Groq (Llama 3 70b) - Ultra-fast LPU inference
 * Fallback Provider: Google Gemini (2.5 Flash) - High reliability & context
 */



import { supabase } from "@/integrations/supabase/client";

export interface NovaAIContext {
    route: string;
    userName: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    activeStudySet?: {
        id: string;
        title: string;
        description?: string;
        topCards?: { term: string; definition: string }[];
    };
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

export interface AIAdminMessage {
    title: string;
    content: string;
    suggestedType: 'info' | 'warning' | 'success' | 'alert';
}

export class NovaAI {
    // Removed for security: private static getGeminiClient()

    // Removed for security: private static getGroqClient()

    /**
     * Executes an AI task with automatic fallback.
     * Tries Groq first, then falls back to Gemini on error.
     */
    private static async executeWithFallback<T>(
        actionName: string,
        groqFn: () => Promise<T>,
        geminiFn: () => Promise<T>
    ): Promise<T> {
        // 1. Try Groq (Primary) via Backend
        try {
            return await groqFn();
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
            return await geminiFn();
        } catch (error) {
            console.error(`❌ [NovaAI] Gemini Fallback Failed for ${actionName}:`, error);
            throw error; // If both fail, throw
        }
    }

    /**
     * Resilient Gemini Executor using Supabase Edge Function
     * Single try as requested by user ("one gemini").
     */
    private static async runGeminiWithRetry(
        systemPrompt: string,
        userPrompt: string,
        jsonMode: boolean = false
    ): Promise<any> {
        console.log("🔍 [NovaAI] Requesting Gemini via Edge Function...");

        const { data, error } = await supabase.functions.invoke('nova-engine', {
            body: {
                provider: 'gemini',
                model: 'gemini-2.5-flash',
                systemPrompt,
                userPrompt,
                jsonMode
            }
        });

        if (error) {
            console.error("❌ [NovaAI] Gemini Edge Function Error:", error);
            throw new Error(`Gemini Edge Function Failed: ${error.message}`);
        }

        const responseText = data.text;

        if (jsonMode) {
            try {
                // Clean up markdown code blocks if present
                const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '');
                return JSON.parse(cleaned);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                throw new Error("Received invalid JSON from AI");
            }
        }

        return responseText;
    }

    /**
     * Shared Helper for Groq Backend Requests
     */
    private static async runGroqViaBackend(
        messages: any[],
        model: string = "llama-3.3-70b-versatile",
        jsonMode: boolean = false
    ): Promise<any> {

        const { data, error } = await supabase.functions.invoke('nova-engine', {
            body: {
                provider: 'groq',
                model,
                messages,
                jsonMode
            }
        });

        if (error) {
            console.error("❌ [NovaAI] Groq Edge Function Error:", error);
            throw new Error(`Groq Edge Function Failed: ${error.message}`);
        }

        if (jsonMode && typeof data.content === 'string') {
            return JSON.parse(data.content);
        }

        return data.content;
    }

    /**
     * AI-powered Content Extraction
     */
    public static async generateStudyContent(text: string, maxCards: number = 50): Promise<AIStudyContent> {
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
1. Extract up to ${maxCards} flashcards (MAXIMUM ${maxCards}, do not exceed this limit).
2. Ignore citations, headers, footers.
3. Identify top 10-20 core concepts.
4. Return ONLY raw JSON code, no markdown formatting.`;

        // Large Document Handling
        // Groq (Llama 3) has a limited context window (approx 8k-128k pending model).
        // Gemini 2.5 Flash has 1M context window.
        // If text is > 40k chars, we skip Groq to ensure full context is read.
        const CHAR_LIMIT_FOR_GROQ = 40000;
        const isLargeDoc = text.length > CHAR_LIMIT_FOR_GROQ;

        // Note: We do NOT truncate 'text' here anymore. We pass the full text.

        try {
            return await this.executeWithFallback<AIStudyContent>(
                'generateStudyContent',
                async () => {
                    // SKIP Groq for large docs to avoid token limit errors or truncation
                    if (isLargeDoc) {
                        throw new Error("Text too long for Groq. Switching to Gemini (Large Doc Mode).");
                    }

                    const result = await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Analyze this content: \n\n${text}` }
                    ], "llama-3.3-70b-versatile", true);

                    if (!result || !result.cards || result.cards.length === 0) {
                        throw new Error("Groq returned empty results (0 cards). Switching to Gemini.");
                    }
                    return result;
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, "Analyze this content: \n\n" + text, true);
                }
            );
        } catch (e) {
            console.error("AI Generation Error:", e);
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
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ]);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, userPrompt, false);
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
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ]);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, text, false);
                }
            );
        } catch (e) {
            return text;
        }
    }

    public static async chat(query: string, context: NovaAIContext): Promise<string> {
        const systemPrompt = `You are "Nova" (v3.0), the AI engine of the "Notebook" platform.
You are a highly efficient, focused, and proactive study partner.

Guidelines:
1. **Be Concise**: Avoid fluff. Get straight to the answer.
2. **Be Action-Oriented**: If a user wants to do something (create, study, quiz), guide them to it or explain how.
3. **Format**: Use **bold** for key concepts. Use lists for steps.
4. **Tone**: Professional, encouraging, but crisp. No long philosophical ramblings unless asked.
5. **Context**: You know the user is ${context.userName} on page ${context.route}.
6. **Multiple Choice**: If user replies with a single letter (A, B, C, D) or short phrase, treat it as an answer to your previous question. Do NOT ask for clarification if it looks like an answer.
${context.activeStudySet ? `6. **Active Study Set**: User is looking at set "${context.activeStudySet.title}" (ID: ${context.activeStudySet.id}).
   - Description: ${context.activeStudySet.description || "N/A"}
   - Top Cards/Context: ${JSON.stringify(context.activeStudySet.topCards?.slice(0, 5) || [])}
   - USE THIS CONTEXT to answer specific questions about the material.` : ""}

**CRITICAL: ONLY suggest features that ACTUALLY EXIST. DO NOT hallucinate or invent features.**

ACTUAL FEATURES (What the app CAN do):
 Create Study Sets (manually add flashcards)
 Import from Files (PDF, Word, PowerPoint, Excel, TXT)
 Study with Flashcards (spaced repetition system)
 Daily Review (cards due today)
 Practice Quizzes (AI-generated multiple choice)
 Essay Practice (AI grading and feedback)
 Textbook Finder (search for textbooks)
 Cognitive Constellation (3D knowledge visualization)
 My Notes (handwritten/typed notes)
 Explore Public Sets (browse community sets)
 Profile & Settings
 Pricing/Upgrade to Pro

FEATURES THAT DO NOT EXIST (Never suggest these):
 NO " Import from Textbook\ feature
 NO \Note Templates\ feature
 NO \Pre-designed Templates\ for notes
 NO \Class Notes\ or \Study Guide\ templates
 NO \Research Notes\ or \Concept Map\ templates
 NO direct textbook content import
 NO template browsing system

When users ask about creating notes or sets:
- Guide them to /create (Create Set) for flashcards
- Guide them to /notebook (My Notes) for freeform notes
- Explain they can import files (PDF, Word, etc.) but NOT from textbooks directly
- DO NOT mention templates, textbook import, or any non-existent features


- / (Dashboard)
- /create (Create Set)
- /sets (My Sets)
- /explore-public-sets (Explore Sets)
- /exams (Practice Quiz)
- /textbook-finder (Textbook Finder)
- /constellation (Constellation)
- /essays (Essay Practice)
- /notebook (My Notes)
- /profile, /settings

Examples:
User: "I'm tired"
Nova: "Take a break. Rest is vital for memory consolidation. Come back in 20 minutes."

User: "take me to explore sets"
Nova: "Navigating to Explore Sets." (Action: navigate to /explore-public-sets)`;

        // Prepare messages for Groq
        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...context.conversationHistory,
            { role: "user", content: query }
        ];

        try {
            return await this.executeWithFallback<string>(
                'chat',
                async () => {
                    return await this.runGroqViaBackend(messages);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, query);
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
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ], "llama-3.3-70b-versatile", true);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, userPrompt, true);
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
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ], "llama-3.3-70b-versatile", true);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, "User Input: " + text, true);
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
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: text }
                    ]);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, text, false);
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
    // End of class
    /**
     * AI-powered Admin Message Generation
     */
    static async generateAdminMessage(topic: string): Promise<AIAdminMessage> {
        const systemPrompt = `You are an expert Communications Director for a tech platform. 
Task: Draft a concise, professional notification message based on the user's topic.
Output: Return ONLY a valid JSON object.
Structure:
{
  "title": "Short, catchy title (max 50 chars)",
  "content": "Clear, informative message body (max 200 chars)",
  "suggestedType": "info" | "warning" | "success" | "alert"
}
Tone: Professional, helpful, and direct.`;

        try {
            return await this.executeWithFallback<AIAdminMessage>(
                'generateAdminMessage',
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Topic: ${topic}` }
                    ], "llama-3.3-70b-versatile", true);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, `Topic: ${topic}`, true);
                }
            );
        } catch (e) {
            console.error("Admin Gen Error:", e);
            return {
                title: "Notification",
                content: topic,
                suggestedType: 'info'
            };
        }
    }
    /**
     * AI-powered Knowledge Graph Generation
     */
    static async generateKnowledgeGraph(contextText: string): Promise<{ concepts: AIExtractedConcept[], relationships: AIExtractedRelationship[] }> {
        const systemPrompt = `You are a Knowledge Graph Architect.
Task: Analyze the provided study material and build a concept map.
Output: JSON object with "concepts" and "relationships".
Structure:
{
  "concepts": [ { "name": "Concept Name", "description": "Brief definition" } ],
  "relationships": [ { "source_name": "Concept A", "target_name": "Concept B", "type": "relates_to" | "causes" | "is_a" | "part_of", "strength": 0.1-1.0 } ]
}
Guidelines:
1. Identify 15-30 high-level concepts that connect different topics.
2. Find hidden connections between terms.
3. Consolidate similar terms (e.g. "Photosynthesis" and "Plant Energy" -> "Photosynthesis").`;

        try {
            return await this.executeWithFallback(
                'generateKnowledgeGraph',
                async () => {
                    return await this.runGroqViaBackend([
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Material to Map: \n\n${contextText}` }
                    ], "llama-3.3-70b-versatile", true);
                },
                async () => {
                    return await this.runGeminiWithRetry(systemPrompt, `Material to Map: \n\n${contextText}`, true);
                }
            );
        } catch (e) {
            console.error("Knowledge Graph Error:", e);
            return { concepts: [], relationships: [] };
        }
    }
}


