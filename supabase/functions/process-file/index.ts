import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.24.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize OpenAI client using the secret API key
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let content = "";
    const fileBuffer = await file.arrayBuffer();

    // For now, we'll stick to simple text files that we know work
    if (file.type.startsWith("text/") || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        content = new TextDecoder().decode(fileBuffer);
    } else {
        return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}. Please use .txt, .csv, or .md.` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }

    if (!content.trim()) {
        return new Response(JSON.stringify({ error: "Could not extract any text from the file." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }

    // --- AI Processing is now re-enabled ---
    const prompt = `
      You are an expert at creating flashcard study sets.
      Based on the following text, generate a list of key terms and their definitions.
      The output should be a valid JSON object with a single key "cards", which is an array of objects.
      Each object in the array should have two properties: "term" and "definition".
      Do not include any explanations or introductory text outside of the JSON object.

      Example format:
      {
        "cards": [
          { "term": "Example Term 1", "definition": "This is the definition for term 1." },
          { "term": "Example Term 2", "definition": "This is the definition for term 2." }
        ]
      }

      Here is the text:
      ---
      ${content}
      ---
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0].message.content;

    if (!result) {
      throw new Error("AI failed to generate a response.");
    }

    return new Response(result, {
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