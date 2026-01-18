
import Groq from 'groq-sdk';

// Convert to Node.js Runtime (remove Edge config) to fix 500 error locally
// export const config = { runtime: 'edge' }; 

export default async function handler(req: any, res: any) {
    // Enable CORS
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Access key inside handler to prevent cold-start crashes
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        console.log(`[NovaAI Groq] Request received. Key Present: ${!!GROQ_API_KEY}`);

        if (!GROQ_API_KEY) {
            console.error("Missing GROQ_API_KEY environment variable");
            return res.status(500).json({
                error: "Server Configuration Error: Missing GROQ_API_KEY. Please check .env file."
            });
        }

        // Initialize client per-request
        const groq = new Groq({ apiKey: GROQ_API_KEY });

        // Vercel Node parses body automatically
        const { messages, model, jsonMode } = req.body;

        console.log(`[NovaAI Groq] Model: ${model}, JSON: ${jsonMode}`);

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: model || "llama-3.3-70b-versatile",
            response_format: jsonMode ? { type: "json_object" } : undefined
        });

        const content = completion.choices[0]?.message?.content || "";
        console.log(`[NovaAI Groq] Success. Length: ${content.length}`);

        return res.status(200).json({ content });

    } catch (error: any) {
        console.error('Groq API Error details:', error);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            details: error.toString()
        });
    }
}
