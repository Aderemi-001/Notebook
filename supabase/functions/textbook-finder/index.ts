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

    const { query } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(JSON.stringify({ error: "Search query is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `
      You are an expert at finding legitimate and ethical access options for textbooks.
      Based on the user's query "${query}", generate a list of plausible, ethical access options for a textbook.
      Focus on academic library access, open educational resources (OER), and official purchase/rental links.
      Do NOT suggest illegal or unauthorized download sites.

      For each result, provide:
      - "title": The title of the textbook or a relevant OER.
      - "author": The author(s) of the textbook.
      - "description": A brief description of the textbook or resource.
      - "access_method": How the user can access it (e.g., "University Library", "Open Educational Resource", "Purchase/Rent Online").
      - "link": A plausible, example URL for access (e.g., a library catalog search URL, an OER repository URL, an Amazon/publisher URL).
      - "cost_implication": "Free", "Purchase", "Rental", or "Subscription Required".

      Generate between 1 and 3 relevant results.
      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have one top-level key: "results".

      Example format:
      {
        "results": [
          {
            "title": "Introduction to Biology",
            "author": "Jane Doe",
            "description": "A comprehensive introduction to biological concepts.",
            "access_method": "University Library",
            "link": "https://library.example.edu/search?q=Introduction+to+Biology",
            "cost_implication": "Free (with library access)"
          },
          {
            "title": "Calculus I: Open Textbook",
            "author": "OpenStax",
            "description": "An openly licensed textbook for first-year calculus.",
            "access_method": "Open Educational Resource",
            "link": "https://openstax.org/details/books/calculus-volume-1",
            "cost_implication": "Free"
          }
        ]
      }

      Here is the user's query: "${query}"
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
    let resultText = geminiData.candidates[0].content.parts[0].text;

    if (!resultText) {
      throw new Error("AI failed to generate a response.");
    }

    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      resultText = jsonMatch[1];
    }

    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", resultText, parseError);
      throw new Error("AI returned invalid JSON. Please try again or refine your input.");
    }

    if (!parsedData.results || !Array.isArray(parsedData.results)) {
      throw new Error("AI response missing 'results' array.");
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) { // Explicitly type 'error' as unknown
    console.error("Error in textbook-finder function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { // Cast 'error' to Error to access .message
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});