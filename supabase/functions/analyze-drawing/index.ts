import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
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
      Deno.env.get('SUPABASE_URL') ?? '',
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
      Analyze the content of this image, which is a drawing on a white background with black lines.

      **Task:**
      1.  **Prioritize Transcription:** Your primary goal is to accurately transcribe any handwritten text (letters, words) or numbers.
          *   If the image contains a clear single character or number, output *only* that character or number.
          *   If there are multiple distinct characters/numbers, transcribe them all, separated by spaces if they are distinct entities.
          *   **Example for numbers:** If the drawing is "25", output "25". If it's "1 2 3", output "1 2 3".
      2.  **Describe if Unclear:** If you cannot confidently transcribe any text or numbers, then provide a brief, concise description of any simple diagrams, sketches, or abstract shapes present. Do NOT state "No text or numbers present" if you can provide a description.

      **Output Format:**
      Provide a concise, plain text output of your observations, without any introductory or concluding remarks. Your response should be the direct transcription or description.
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

  } catch (error) {
    console.error("Error in analyze-drawing function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});