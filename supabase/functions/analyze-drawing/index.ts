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
    // @ts-ignore
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

    const { base64Image, mimeType } = await req.json();

    if (!base64Image || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing base64Image or mimeType." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Prepare the image for Gemini API
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const prompt = `
      You are an expert at transcribing handwritten content from images.
      Your sole purpose is to accurately transcribe any handwritten text (letters, words) or numbers present in the image.

      If you find clear handwritten text or numbers:
      - Transcribe them directly.
      - If there are multiple distinct items, separate them with spaces.
      - For example, if the drawing is "25", output "25". If it's "1 2 3", output "1 2 3".

      If you cannot confidently transcribe any text or numbers, then provide a very brief, concise description of any simple diagrams, sketches, or abstract shapes.

      Output Format:
      Provide a concise, plain text output of your transcription or description. Do not add any other text or markdown.
    `;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            imagePart,
          ],
        }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`Gemini API request failed: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const geminiData = await geminiResponse.json();
    let extractedContent = geminiData.candidates[0].content.parts[0].text;

    // If AI returns empty or very generic response, provide a more helpful message
    if (!extractedContent || extractedContent.trim() === "") {
      extractedContent = "No discernible text or visual information was extracted from the drawing. Please ensure your drawing is clear and distinct.";
    }

    return new Response(JSON.stringify({ extracted_content: extractedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) { // Explicitly type 'error' as unknown
    console.error("Error in analyze-drawing function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { // Cast 'error' to Error to access .message
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});