/// <reference types="../deno.d.ts" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req: Request) => { // Explicitly type 'req' as Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set in project secrets." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { user_query } = await req.json();

    if (!user_query || typeof user_query !== 'string' || !user_query.trim()) {
      return new Response(JSON.stringify({ error: "No user query provided." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `
      You are a helpful assistant for a study application called "My Notebook".
      Your goal is to answer user questions about how to use the application's features.
      Use the provided knowledge base below to answer questions.
      If a feature is "Under Construction", state that clearly.
      If the question is outside the scope of the application's features, politely state that you can only answer questions about the app.
      Keep your answers concise and to the point.

      **Application Knowledge Base:**
      ${APP_KNOWLEDGE_BASE}

      **User Question:**
      ${user_query}

      **Your Answer:**
    `;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`Gemini API request failed: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const geminiData = await geminiResponse.json();
    const chatbot_response = geminiData.candidates[0].content.parts[0].text;

    if (!chatbot_response) {
      throw new Error("AI failed to generate a response.");
    }

    return new Response(JSON.stringify({ chatbot_response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) { // Explicitly type 'error' as unknown
    console.error("Error in chatbot-qa function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { // Cast 'error' to Error to access .message
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});