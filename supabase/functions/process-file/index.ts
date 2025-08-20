import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OpenAI API key." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `You are an expert assistant that extracts key terms and definitions from a given text and formats them as a JSON array of objects. Each object must have a "term" and a "definition" key. Do not include any extra text or explanations, only the JSON array. Here is the text:\n\n---\n\n${content}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error("Failed to get a response from the AI service.");
    }

    const data = await response.json();
    const jsonResponse = JSON.parse(data.choices[0].message.content);
    
    // Assuming the AI returns an object with a key like "cards" or "terms" containing the array
    const cards = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.cards || jsonResponse.terms || [];

    return new Response(JSON.stringify({ cards }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});