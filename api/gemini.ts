import { GoogleGenAI } from "@google/genai";

// API key from env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
}

// Initialize the new SDK client
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default async function handler(req: any, res: any) {
    // Vercel Serverless Functions use (req, res) signature by default in Node.js

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Vercel parses JSON body automatically
        const { systemPrompt, userPrompt, modelName, jsonMode } = req.body;

        // Default to gemini-2.5-flash (free tier) and map old 1.5 name to 2.5
        const targetModel =
            modelName === "gemini-1.5-flash"
                ? "gemini-2.5-flash"
                : modelName || "gemini-2.5-flash";

        const finalPrompt = systemPrompt
            ? `${systemPrompt}\n\n${userPrompt}`
            : userPrompt;

        // New SDK call style: ai.models.generateContent(...)
        const result = await genAI.models.generateContent({
            model: targetModel,
            contents: [
                {
                    role: "user",
                    parts: [{ text: finalPrompt }],
                },
            ],
            config: jsonMode
                ? { responseMimeType: "application/json" }
                : undefined,
        });

        // Extract text from candidates (fallback for missing helper)
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return res.status(200).json({ text: responseText });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
