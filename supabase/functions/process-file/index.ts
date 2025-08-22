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
    const { textContent, imageParts, numCards, mode } = await req.json(); // Expect textContent, imageParts, numCards, and mode

    if ((!textContent || typeof textContent !== 'string' || !textContent.trim()) && (!imageParts || imageParts.length === 0)) {
      return new Response(JSON.stringify({ error: "No text content or image parts provided in the request body." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const parts = [];
    let prompt = "";

    if (mode === 'estimate') {
      prompt = `
        You are an expert at analyzing educational content.
        Based on the following content (which may include text and/or images), estimate the maximum number of high-quality flashcards (term and definition pairs) that could be generated.
        Consider the depth and breadth of the information.
        The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
        The JSON object should have one top-level key: "optimal_max_cards".

        Example format:
        {
          "optimal_max_cards": 25
        }

        Here is the content:
        ---
      `;
    } else { // mode === 'generate' or default
      prompt = `
        You are an expert at creating flashcard study sets and identifying key concepts and their relationships within a given text.
        Based on the following content (which may include text and/or images), generate a list of key terms and their definitions,
        a list of core concepts, and a list of relationships between these concepts.
        If images are provided, perform OCR to extract text from them and integrate that text into your analysis.

        **Flashcard Generation Guidelines:**
        *   **Focus on Core Learning Content:** Generate flashcards that cover essential facts, definitions, theories, and important details directly related to the subject matter.
        *   **Avoid Meta-Information:** Do NOT create flashcards about the document's title, author, file format, structural elements (like "Module 1"), or any information that describes the document itself rather than its educational content.
        *   **Quantity:**
            ${numCards ? `Generate ${numCards} flashcards. Aim to produce a number of cards that is within one (plus or minus) of the requested quantity. Only generate fewer if the content is truly insufficient to create distinct and high-quality cards without redundancy. Do not generate more than ${numCards + 1} cards.` : `Generate an optimal number of high-quality flashcards.`}

        The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
        The JSON object should have four top-level keys: "cards", "concepts", "relationships", and "optimal_max_cards".

        "cards" should be an array of objects, each with "term" and "definition" properties.
        "concepts" should be an array of objects, each with a "name" (string) and an optional "description" (string, a brief summary of the concept).
        "relationships" should be an array of objects, each with "source_name" (string, name of the source concept), "target_name" (string, name of the target concept), "type" (string, e.g., "related_to", "is_prerequisite_for", "is_part_of", "causes", "explains"), and "strength" (number, 0.0 to 1.0, indicating confidence or relevance).
        "optimal_max_cards" should be an integer representing the maximum number of high-quality flashcards you estimate could be generated from the provided content.

        Ensure that all "source_name" and "target_name" in "relationships" refer to "name" values present in the "concepts" array.
        Keep the concepts and relationships concise and directly derived from the content.

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
          ],
          "optimal_max_cards": 15
        }

        Here is the content:
        ---
      `;
    }

    parts.push({ text: prompt });

    // Add text content if available
    if (textContent && textContent.trim()) {
      parts.push({ text: textContent });
    }

    // Add image parts if available
    if (imageParts && imageParts.length > 0) {
      imageParts.forEach((img: { data: string; mimeType: string }) => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    }
    parts.push({ text: "---" }); // Closing delimiter for content

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
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

    if (mode === 'estimate') {
      if (typeof parsedData.optimal_max_cards !== 'number') {
        console.warn("AI response missing 'optimal_max_cards' or it's not a number in estimate mode. Defaulting to 0.");
        parsedData.optimal_max_cards = 0;
      }
      return new Response(JSON.stringify({ optimal_max_cards: parsedData.optimal_max_cards }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Basic validation for expected structure in generate mode
      if (!parsedData.cards || !Array.isArray(parsedData.cards)) {
        throw new Error("AI response missing 'cards' array.");
      }
      if (!parsedData.concepts || !Array.isArray(parsedData.concepts)) {
        throw new Error("AI response missing 'concepts' array.");
      }
      if (!parsedData.relationships || !Array.isArray(parsedData.relationships)) {
        throw new Error("AI response missing 'relationships' array.");
      }
      if (typeof parsedData.optimal_max_cards !== 'number') {
        console.warn("AI response missing 'optimal_max_cards' or it's not a number. Defaulting to 0.");
        parsedData.optimal_max_cards = 0;
      }
      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    console.error("Error in function execution:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});