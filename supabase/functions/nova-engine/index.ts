import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const requestData = await req.json();
        const { provider, model, messages, systemPrompt, userPrompt, jsonMode } = requestData;

        console.log(`[Nova Engine] Request received for provider: ${provider}, model: ${model}`);

        if (provider === 'groq') {
            return await handleGroqRequest(model, messages, jsonMode);
        } else if (provider === 'gemini') {
            return await handleGeminiRequest(model, systemPrompt, userPrompt, jsonMode);
        } else {
            throw new Error(`Unsupported provider: ${provider}`);
        }

    } catch (error) {
        console.error('[Nova Engine] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

async function handleGroqRequest(model: string, messages: any[], jsonMode: boolean) {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not found in environment');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile', // Default to Llama 3 70b
            messages: messages,
            response_format: jsonMode ? { type: "json_object" } : undefined,
            temperature: 0.5,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('[Nova Engine] Groq API Error:', errorData);
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    return new Response(
        JSON.stringify({ content: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function handleGeminiRequest(model: string, systemPrompt: string, userPrompt: string, jsonMode: boolean) {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment');
    }

    const modelName = model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    // Gemini's prompt structure
    const contents = [
        {
            role: 'user',
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
        }
    ];

    /*
     * Note: Gemini 1.5 Flash supports system instructions via 'system_instruction' field,
     * but merging into prompt is often safer for broad compatibility across versions unless specific 1.5 features are needed.
     * However, let's use the standard contents array for simplicity.
     */

    const generationConfig = jsonMode ? { response_mime_type: "application/json" } : undefined;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: contents,
            generationConfig: generationConfig
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('[Nova Engine] Gemini API Error:', errorData);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(
        JSON.stringify({ text: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
