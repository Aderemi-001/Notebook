import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
    const { content } = await req.json(); // Expect content directly in JSON body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return new Response(JSON.stringify({ error: "No text content provided in the request body." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `
      You are an expert at creating flashcard study sets and identifying key concepts and their relationships within a given text.
      Based on the following text, generate a list of key terms and their definitions,
      a list of core concepts, and a list of relationships between these concepts.

      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have three top-level keys: "cards", "concepts", and "relationships".

      "cards" should be an array of objects, each with "term" and "definition" properties.
      "concepts" should be an array of objects, each with a "name" (string) and an optional "description" (string, a brief summary of the concept).
      "relationships" should be an array of objects, each with "source_name" (string, name of the source concept), "target_name" (string, name of the target concept), "type" (string, e.g., "related_to", "is_prerequisite_for", "is_part_of", "causes", "explains"), and "strength" (number, 0.0 to 1.0, indicating confidence or relevance).

      Ensure that all "source_name" and "target_name" in "relationships" refer to "name" values present in the "concepts" array.
      Keep the concepts and relationships concise and directly derived from the text.

      Example format:
      {
        "cards": [
          { "term": "Example Term 1", "definition": "This is the definition for term 1." },
          { "term": "Example Term 2", "definition": "This is the definition for term 2." }
        ],
        "concepts": [
          { "name": "Concept A", "description": "A foundational idea." },
          { "name": "Concept B", "description": "A related idea." }
        ],
        "relationships": [
          { "source_name": "Concept A", "target_name": "Concept B", "type": "related_to", "strength": 0.9 }
        ]
      }

      Here is the text:
      ---
      ${content}
      ---
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

    // Attempt to extract JSON from markdown if present
    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      resultText = jsonMatch[1];
    }

    // Validate and parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", resultText, parseError);
      throw new Error("AI returned invalid JSON. Please try again or refine your input.");
    }

    // Basic validation for expected structure
    if (!parsedData.cards || !Array.isArray(parsedData.cards)) {
      throw new Error("AI response missing 'cards' array.");
    }
    if (!parsedData.concepts || !Array.isArray(parsedData.concepts)) {
      throw new Error("AI response missing 'concepts' array.");
    }
    if (!parsedData.relationships || !Array.isArray(parsedData.relationships)) {
      throw new Error("AI response missing 'relationships' array.");
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in function execution:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});