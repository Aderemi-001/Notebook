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

    // Fetch all study sets for the current user that have source_text
    const { data: userStudySets, error: fetchSetsError } = await supabase
      .from('study_sets')
      .select('id, source_text')
      .eq('user_id', user.id)
      .not('source_text', 'is', null);

    if (fetchSetsError) {
      console.error("Error fetching user study sets:", fetchSetsError);
      throw new Error(`Failed to fetch user study sets: ${fetchSetsError.message}`);
    }

    if (!userStudySets || userStudySets.length === 0) {
      return new Response(JSON.stringify({ message: "No study sets with source text found for re-evaluation." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch existing concepts for the user to provide context to the AI
    const { data: existingConcepts, error: fetchConceptsError } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('user_id', user.id);

    if (fetchConceptsError) {
      console.error("Error fetching existing concepts:", fetchConceptsError);
      // Continue without existing concepts if there's an error, or throw
    }

    const existingConceptMap = new Map(existingConcepts?.map(c => [c.name, c.id]));
    const existingConceptNames = existingConcepts ? existingConcepts.map(c => c.name) : [];

    let totalConceptsProcessed = 0;
    let totalRelationshipsProcessed = 0;

    for (const studySet of userStudySets) {
      const content = studySet.source_text;
      if (!content) continue; // Should not happen due to .not('source_text', 'is', null)

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
        console.error(`Gemini API Error for set ${studySet.id}:`, errorBody);
        // Continue to next set, but log the error
        continue;
      }

      const geminiData = await geminiResponse.json();
      let resultText = geminiData.candidates[0].content.parts[0].text;

      if (!resultText) {
        console.warn(`AI failed to generate a response for set ${studySet.id}.`);
        continue;
      }

      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        resultText = jsonMatch[1];
      }

      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
      } catch (parseError) {
        console.error(`Failed to parse AI response as JSON for set ${studySet.id}:`, resultText, parseError);
        continue;
      }

      if (!parsedData.concepts || !Array.isArray(parsedData.concepts)) {
        console.warn(`AI response missing 'concepts' array for set ${studySet.id}.`);
        continue;
      }
      if (!parsedData.relationships || !Array.isArray(parsedData.relationships)) {
        console.warn(`AI response missing 'relationships' array for set ${studySet.id}.`);
        continue;
      }

      const newConcepts = parsedData.concepts;
      const newRelationships = parsedData.relationships;

      // Process concepts (upserting existing, inserting new)
      for (const concept of newConcepts) {
        let conceptId: string | undefined = existingConceptMap.get(concept.name);

        if (conceptId) {
          // Concept exists, update its description if it changed
          await supabase.from('concepts').update({ description: concept.description }).eq('id', conceptId);
        } else {
          // Concept is new, insert it
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
          existingConceptMap.set(concept.name, conceptId); // Add to map for subsequent relationships
          totalConceptsProcessed++;
        }
      }

      // Process relationships (upserting)
      if (newRelationships && newRelationships.length > 0) {
        const relationshipsToUpsert = [];
        for (const rel of newRelationships) {
          const sourceId = existingConceptMap.get(rel.source_name);
          const targetId = existingConceptMap.get(rel.target_name);
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
          } else {
            totalRelationshipsProcessed += relationshipsToUpsert.length;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: "Constellation re-evaluated successfully.",
      concepts_processed: totalConceptsProcessed,
      relationships_processed: totalRelationshipsProcessed,
    }), {
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