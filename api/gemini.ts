import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
    // Vercel Serverless Functions use (req, res) signature by default in Node.js

    // Enable CORS manually if needed (though usually handled by Vercel/Next)
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // API key from env - Check INSIDE handler to prevent crash on cold start
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        console.log(`[NovaAI API] Request received. Key Present: ${!!GEMINI_API_KEY}`);

        if (!GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY environment variable");
            return res.status(500).json({
                error: "Server Configuration Error: Missing GEMINI_API_KEY. Please check .env file."
            });
        }

        // Initialize the SDK client per request (lightweight)
        const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const { systemPrompt, userPrompt, modelName, jsonMode } = req.body;
        console.log(`[NovaAI API] Model: ${modelName}, JSON: ${jsonMode}`);

        // Default to gemini-2.5-flash (free tier) and map old 1.5 name to 2.5
        const targetModel =
            modelName === "gemini-1.5-flash"
                ? "gemini-2.5-flash"
                : modelName || "gemini-2.5-flash";

        // Note: GoogleGenAI node SDK might use slightly different model naming than REST. 'gemini-2.5-flash' is standard.

        const finalPrompt = systemPrompt
            ? `${systemPrompt}\n\n${userPrompt}`
            : userPrompt;

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

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

        console.log(`[NovaAI API] Success. Length: ${responseText.length}`);
        return res.status(200).json({ text: responseText });

    } catch (error: any) {
        console.error("Gemini API Error details:", error);
        return res.status(500).json({
            error: error.message || "Internal Server Error",
            details: error.toString()
        });
    }
}
