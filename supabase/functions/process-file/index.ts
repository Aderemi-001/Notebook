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
// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Helper to upload file to Gemini (for large files > 20MB or just general robustness)
async function uploadToGemini(fileBuffer: ArrayBuffer, mimeType: string) {
  const NUM_BYTES = fileBuffer.byteLength;
  console.log(`Initialising Gemini Upload for ${NUM_BYTES} bytes...`);

  // 1. Start Resumable Upload
  const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
  const startRes = await fetch(startUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': NUM_BYTES.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { display_name: 'uploaded_doc' } })
  });

  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error("Failed to get Gemini upload URL");

  // 2. Upload Bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST', // or PUT? Google docs say PUT usually, but Resumable protocol uses POST for start, PUT/POST for bytes.
    // 'X-Goog-Upload-Command': 'upload, finalize',
    headers: {
      'Content-Length': NUM_BYTES.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize'
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`Gemini byte upload failed: ${txt}`);
  }

  const fileData = await uploadRes.json();
  console.log("File uploaded to Gemini:", fileData.file.uri);
  return fileData.file.uri;
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set in project secrets." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const body = await req.json();
    console.log("DEBUG: Received Request Body:", JSON.stringify(body, null, 2));

    // Support both camelCase and snake_case for flexibility
    const textContent = body.textContent || body.text_content;
    const imageParts = body.imageParts || body.image_parts;
    const numCards = body.numCards || body.num_cards;
    const mode = body.mode || body.operation || 'generate';
    const filePath = body.filePath || body.file_path;
    const bucketName = body.bucketName || body.bucket_name || body.bucket;

    const parts = [];

    // --- CASE 1: File Path Provided (Storage Download -> Gemini File API) ---
    if (filePath && bucketName) {
      console.log(`DEBUG: CASE 1 - Processing from storage: ${bucketName}/${filePath}`);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: fileData, error: dlError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (dlError) throw dlError;

      const buffer = await fileData.arrayBuffer();
      // Determine Mime Type (guess from ext or fileData)
      const mimeType = fileData.type || 'application/pdf'; // User 'application/octet-stream' might happen, default to PDF for now

      // Upload to Gemini
      try {
        const fileUri = await uploadToGemini(buffer, mimeType);
        parts.push({
          file_data: {
            mime_type: mimeType,
            file_uri: fileUri
          }
        });
      } catch (uploadErr) {
        console.error("Gemini Upload Failed:", uploadErr);
        throw new Error("Failed to process large file with AI provider.");
      }
    }
    // --- CASE 2: Inline Text/Images (Legacy/Small files) ---
    else if ((!textContent || typeof textContent !== 'string' || !textContent.trim()) && (!imageParts || imageParts.length === 0)) {
      console.error("DEBUG: CASE 2 - No content provided and no file path.");
      return new Response(JSON.stringify({
        error: "No content provided.",
        debug: {
          hasFilePath: !!filePath,
          hasBucket: !!bucketName,
          hasText: !!textContent,
          hasImages: !!imageParts,
          receivedBody: body
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    } else {
      console.log("DEBUG: CASE 2 - Processing inline content");
      // ... (Existing text/image logic)
      // Add text content if available (Truncate for reliability)
      if (textContent && textContent.trim()) {
        const safeText = textContent.length > 60000 ? textContent.substring(0, 60000) : textContent;
        parts.push({ text: safeText });
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
    }

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
        a list of core concepts, a list of relationships between these concepts, and links between cards and concepts.
        If images are provided, perform OCR to extract text from them and integrate that text into your analysis.

        **Flashcard Generation Guidelines:**
        *   **Focus on Core Learning Content:** Generate flashcards that cover essential facts, definitions, theories, and important details directly related to the subject matter.
        *   **Avoid Meta-Information:** Do NOT create flashcards about the document's title, author, file format, structural elements (like "Module 1"), or any information that describes the document itself rather than its educational content.
        *   **Quantity:**
            ${numCards ? `Generate ${numCards} flashcards. Aim to produce a number of cards that is within one (plus or minus) of the requested quantity. Only generate fewer if the content is truly insufficient to create distinct and high-quality cards without redundancy. Do not generate more than ${numCards + 1} cards.` : `Generate an optimal number of high-quality flashcards.`}

        The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
        The JSON object should have four top-level keys: "cards", "concepts", "relationships", "card_concept_links", and "optimal_max_cards".

        "cards" should be an array of objects, each with "term" and "definition" properties.
        "concepts" should be an array of objects, each with a "name" (string) and an optional "description" (string, a brief summary of the concept).
        "relationships" should be an array of objects, each with "source_name" (string, name of the source concept), "target_name" (string, name of the target concept), "type" (string, e.g., "related_to", "is_prerequisite_for", "is_part_of", "causes", "explains"), and "strength" (number, 0.0 to 1.0, indicating confidence or relevance).
        "card_concept_links" should be an array of objects, each with "card_term" (string, the term of the flashcard) and "concept_name" (string, the name of the concept it relates to).
        "optimal_max_cards" should be an integer representing the maximum number of high-quality flashcards you estimate could be generated from the provided content.

        Ensure that all "source_name" and "target_name" in "relationships" refer to "name" values present in the "concepts" array.
        Ensure that all "card_term" in "card_concept_links" refer to "term" values present in the "cards" array, and all "concept_name" refer to "name" values present in the "concepts" array.
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
          "card_concept_links": [
            { "card_term": "Example Term 1", "concept_name": "Concept A" },
            { "card_term": "Example Term 2", "concept_name": "Concept B" }
          ],
          "optimal_max_cards": 15
        }

        Here is the content:
        ---
      `;
    }

    parts.push({ text: prompt });

    // (Parts construction moved above)
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
    console.log("DEBUG: Gemini Full Response:", JSON.stringify(geminiData, null, 2));

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error("DEBUG: Gemini returned no candidates.");
      throw new Error(`AI failed to generate a response. Reasons: ${JSON.stringify(geminiData.promptFeedback || 'No feedback provided')}`);
    }

    const candidate = geminiData.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error("DEBUG: Gemini candidate has no content/parts.");
      throw new Error(`AI returned an empty candidate. Finish Reason: ${candidate.finishReason || 'Unknown'}`);
    }

    let resultText = candidate.content.parts[0].text;

    if (!resultText) {
      throw new Error("AI failed to generate a text response.");
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
      if (!parsedData.card_concept_links || !Array.isArray(parsedData.card_concept_links)) {
        console.warn("AI response missing 'card_concept_links' array. Proceeding without them.");
        parsedData.card_concept_links = []; // Default to empty array
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

  } catch (error: unknown) {
    console.error("Error in function execution:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});