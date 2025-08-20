import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Function invoked with method: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Attempting to parse FormData.");
    const formData = await req.formData();
    console.log("FormData parsed successfully.");

    const file = formData.get("file") as File;

    if (!file) {
      console.error("Error: No file found in FormData.");
      return new Response(JSON.stringify({ error: "No file provided." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`File received: ${file.name}, type: ${file.type}, size: ${file.size} bytes.`);

    // Temporarily disable PDF processing to isolate the issue.
    if (file.type === "application/pdf") {
      console.error("Error: PDF processing is temporarily disabled for diagnostics.");
      return new Response(JSON.stringify({ error: "PDF processing is currently disabled for testing. Please try a .txt file." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
      });
    }

    let content = "";
    console.log("Reading file content as ArrayBuffer.");
    const fileBuffer = await file.arrayBuffer();
    console.log("File read into ArrayBuffer successfully.");

    if (file.type.startsWith("text/") || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        console.log("Decoding file content as text.");
        content = new TextDecoder().decode(fileBuffer);
        console.log("File decoded successfully.");
    } else {
        console.error(`Unsupported file type: ${file.type}`);
        return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}. Please use .txt, .csv, or .md.` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }

    if (!content.trim()) {
        console.error("Error: Extracted content is empty.");
        return new Response(JSON.stringify({ error: "Could not extract any text from the file." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }

    const snippet = content.substring(0, 400);
    console.log("Diagnostic successful. Returning content snippet.");
    return new Response(JSON.stringify({ diagnostic_success: true, content_snippet: snippet }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Critical error in function execution:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});