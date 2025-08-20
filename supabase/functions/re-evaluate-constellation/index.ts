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
    const { studySetId } = await req.json();
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

    // Fetch the source text for the given study set
    const { data: studySetData, error: fetchSetError } = await supabase
      .from('study_sets')
      .select('source_text')
      .eq('id', studySetId)
      .eq('user_id', user.id) // Ensure user owns the set
      .single();

    if (fetchSetError) {
      console.error("Error fetching study set source text:", fetchSetError);
      throw new Error(`Failed to fetch source text: ${fetchSetError.message}`);
    }
    if (!studySetData || !studySetData.source_text) {
      throw new Error("No source text found for this study set.");
    }

    const content = studySetData.source_text;

    // Fetch existing concepts for the user to provide context to the AI
    const { data: existingConcepts, error: fetchConceptsError } = await supabase
      .from('concepts')
      .select('name, description')
      .eq('user_id', user.id);

    if (fetchConceptsError) {
      console.error("Error fetching existing concepts:", fetchConceptsError);
      // Continue without existing concepts if there's an error, or throw
    }

    const existingConceptNames = existingConcepts ? existingConcepts.map(c => c.name) : [];

    const prompt = `
      You are an expert at identifying key concepts and their relationships within a given text.
      Based on the following text, re-evaluate and generate a list of core concepts, and a list of relationships between these concepts.
      Consider the following existing concepts for context, but also identify new ones if present: ${existingConceptNames.join(', ')}.

      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have two top-level keys: "concepts" and "relationships".

      "concepts" should be an array of objects, each with a "name" (string) and an optional "description" (string, a brief summary of the concept).
      "relationships" should be an array of objects, each with "source_name" (string, name of the source concept), "target_name" (string, name of the target concept), "type" (string, e.g., "related_to", "is_prerequisite_for", "is_part_of", "causes", "explains"), and "strength" (number, 0.0 to 1.0, indicating confidence or relevance).

      Ensure that all "source_name" and "target_name" in "relationships" refer to "name" values present in the "concepts" array (either new or existing).
      Keep the concepts and relationships concise and directly derived from the text.

      Example format:
      {
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

    const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      resultText = jsonMatch[1];
    }

    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", resultText, parseError);
      throw new Error("AI returned invalid JSON. Please try again or refine your input.");
    }

    if (!parsedData.concepts || !Array.isArray(parsedData.concepts)) {
      throw new Error("AI response missing 'concepts' array.");
    }
    if (!parsedData.relationships || !Array.isArray(parsedData.relationships)) {
      throw new Error("AI response missing 'relationships' array.");
    }

    const newConcepts = parsedData.concepts;
    const newRelationships = parsedData.relationships;

    const conceptNameToIdMap = new Map<string, string>();

    // Process concepts (upserting existing, inserting new)
    for (const concept of newConcepts) {
      const { data: existingConcept, error: fetchConceptError } = await supabase
        .from('concepts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', concept.name)
        .single();

      if (fetchConceptError && fetchConceptError.code !== 'PGRST116') {
        console.error("Error fetching existing concept during re-evaluation:", fetchConceptError);
        continue;
      }

      let conceptId: string;
      if (existingConcept) {
        conceptId = existingConcept.id;
        // Optionally update description if it changed
        await supabase.from('concepts').update({ description: concept.description }).eq('id', conceptId);
      } else {
        const { data: insertedConcept, error: insertConceptError } = await supabase
          .from('concepts')
          .insert({ user_id: user.id, name: concept.name, description: concept.description })
          .select('id')
          .single();
        if (insertConceptError) {
          console.error("Error inserting concept during re-evaluation:", insertConceptError);
          continue;
        }
        conceptId = insertedConcept.id;
      }
      conceptNameToIdMap.set(concept.name, conceptId);
    }

    // Process relationships (upserting)
    if (newRelationships && newRelationships.length > 0) {
      const relationshipsToUpsert = [];
      for (const rel of newRelationships) {
        const sourceId = conceptNameToIdMap.get(rel.source_name);
        const targetId = conceptNameToIdMap.get(rel.target_name);
        if (sourceId && targetId) {
          relationshipsToUpsert.push({
            user_id: user.id,
            source_concept_id: sourceId,
            target_concept_id: targetId,
            type: rel.type,
            strength: rel.strength || 0.5,
          });
        }
      }

      if (relationshipsToUpsert.length > 0) {
        const { error: upsertRelError } = await supabase
          .from('concept_relationships')
          .upsert(relationshipsToUpsert, { onConflict: 'user_id,source_concept_id,target_concept_id,type' });
        if (upsertRelError) {
          console.error("Error upserting relationships during re-evaluation:", upsertRelError);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Constellation re-evaluated successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in re-evaluate-constellation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});