import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Updated Deno std version
import { parsePdf } from "https://deno.land/x/pdf_parser@v0.1.0/mod.ts"; // New PDF parsing library

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

    if (file.type === "application/pdf") {
      try {
        const pdfData = new Uint8Array(fileBuffer);
        const parsed = await parsePdf(pdfData);
        content = parsed.text; // Extract text from the parsed PDF
      } catch (pdfError) {
        console.error("Error parsing PDF:", pdfError);
        return new Response(JSON.stringify({ error: "Failed to parse PDF file. It might be corrupted or unsupported." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else if (file.type.startsWith("text/") || 
               file.name.endsWith('.md') || 
               file.name.endsWith('.csv') ||
               file.name.endsWith('.json') ||
               file.name.endsWith('.xml') ||
               file.name.endsWith('.html') ||
               file.name.endsWith('.js') ||
               file.name.endsWith('.ts') ||
               file.name.endsWith('.css')
    ) {
        content = new TextDecoder().decode(fileBuffer);
    } else {
        return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}. Please use .txt, .csv, .md, .json, .xml, .html, .js, .ts, .css, or .pdf.` }), {
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

    const prompt = `
      You are an expert at creating flashcard study sets.
      Based on the following text, generate a list of key terms and their definitions.
      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have a single key "cards", which is an array of objects.
      Each object in the array should have two properties: "term" and "definition".

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