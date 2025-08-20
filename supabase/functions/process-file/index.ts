import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Using esm.sh for Deno compatibility with pdfjs-dist
import { getDocument } from "https://esm.sh/pdfjs-dist@3.11.174";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to extract text from a PDF file buffer
async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
    // The type assertion is needed because the esm.sh module typing is generic
    const pdf = await getDocument({ data: fileBuffer } as any).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // deno-lint-ignore no-explicit-any
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(" ") + "\n";
    }
    return text;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Function invoked. Starting diagnostic test: file reading.");
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

    // Extract content based on file type
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

    // DIAGNOSTIC STEP: Return extracted text instead of calling AI
    const snippet = content.substring(0, 400);
    return new Response(JSON.stringify({ diagnostic_success: true, content_snippet: snippet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error during file processing diagnostic:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});