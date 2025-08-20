import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Switched to esm.sh for better Deno compatibility
import { getDocument } from "https://esm.sh/pdfjs-dist@3.11.174";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
    // The type assertion is needed because the esm.sh module typing is generic
    const pdf = await getDocument({ data: fileBuffer } as any).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(" ") + "\n";
    }
    return text;
}

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
        content = await extractTextFromPdf(fileBuffer);
    } else if (file.type.startsWith("text/") || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        content = new TextDecoder().decode(fileBuffer);
    } else {
        return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}` }), {
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

    const prompt = `You are an expert assistant that extracts key terms and definitions from a given text and formats them as a JSON array of objects. Each object must have a "term" and a "definition" key. Do not include any extra text or explanations, only the JSON array. The response should be a JSON object with a single key "cards" that contains the array. Here is the text:\n\n---\n\n${content}`;

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
    
    const cards = jsonResponse.cards || [];

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