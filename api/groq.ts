
import Groq from 'groq-sdk';

export const config = {
    runtime: 'edge',
};

// Access the API key securely from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { messages, model, jsonMode } = await request.json();

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: model || "llama-3.3-70b-versatile",
            response_format: jsonMode ? { type: "json_object" } : undefined
        });

        const content = completion.choices[0]?.message?.content || "";

        return new Response(JSON.stringify({ content }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Groq API Error:', error);
        // Handle Rate Limits specifically if needed, but generic error suffices for proxy
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
