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

    const { conceptIds, numQuestions } = await req.json();

    if (!conceptIds || !Array.isArray(conceptIds) || conceptIds.length === 0) {
      return new Response(JSON.stringify({ error: "At least one concept ID is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the selected concepts
    const { data: concepts, error: fetchConceptsError } = await supabase
      .from('concepts')
      .select('id, name, description')
      .in('id', conceptIds)
      .eq('user_id', user.id);

    if (fetchConceptsError) {
      console.error("Error fetching concepts:", fetchConceptsError);
      throw new Error(`Failed to fetch concepts: ${fetchConceptsError.message}`);
    }

    if (!concepts || concepts.length === 0) {
      return new Response(JSON.stringify({ error: "No valid concepts found for the given IDs." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch all card_concepts links for the selected concepts and user
    const { data: cardConceptLinks, error: fetchCardConceptLinksError } = await supabase
      .from('card_concepts')
      .select('card_id')
      .in('concept_id', conceptIds)
      .eq('user_id', user.id);

    if (fetchCardConceptLinksError) {
      console.error("Error fetching card-concept links:", fetchCardConceptLinksError);
      throw new Error(`Failed to fetch card-concept links: ${fetchCardConceptLinksError.message}`);
    }

    const uniqueCardIds = Array.from(new Set(cardConceptLinks?.map(link => link.card_id) || []));

    let combinedContent = "";
    let combinedConceptNames = concepts.map(c => c.name).join(', ');
    let uniqueStudySetIds = new Set<string>(); // Declared here, outside the conditional block

    // Add concept descriptions to content
    concepts.forEach(c => {
      if (c.description) {
        combinedContent += `Concept: ${c.name}\nDescription: ${c.description}\n\n`;
      }
    });

    if (uniqueCardIds.length > 0) {
      // Fetch cards and their associated study sets
      const { data: cardsWithSets, error: fetchCardsError } = await supabase
        .from('cards')
        .select('term, definition, study_sets(id, title, source_text)')
        .in('id', uniqueCardIds);

      if (fetchCardsError) {
        console.error("Error fetching cards with sets:", fetchCardsError);
        throw new Error(`Failed to fetch cards with sets: ${fetchCardsError.message}`);
      }

      cardsWithSets?.forEach(card => {
        combinedContent += `Term: ${card.term}\nDefinition: ${card.definition}\n\n`;
        if (card.study_sets?.id) {
          uniqueStudySetIds.add(card.study_sets.id);
        }
      });

      // Fetch source text from study sets if available
      if (uniqueStudySetIds.size > 0) {
        const { data: studySetsWithSource, error: fetchSourceError } = await supabase
          .from('study_sets')
          .select('id, title, source_text')
          .in('id', Array.from(uniqueStudySetIds));

        if (fetchSourceError) {
          console.error("Error fetching study set source text:", fetchSourceError);
        } else {
          studySetsWithSource?.forEach(set => {
            if (set.source_text) {
              combinedContent += `\n--- Content from Set: ${set.title} ---\n${set.source_text}\n\n`;
            }
          });
        }
      }
    }

    if (!combinedContent.trim()) {
      return new Response(JSON.stringify({ error: "No relevant content found for the selected concepts to generate questions from." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `
      You are an expert at generating insightful essay questions and suggested answer points from provided study material.
      Based on the following content, focusing on the concepts: ${combinedConceptNames}, generate ${numQuestions || 3} essay questions.

      For each question, provide:
      - "question_text": The full essay question.
      - "suggested_points": An array of strings, outlining key concepts or arguments that should be covered in a comprehensive answer. These should be concise bullet points.

      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have one top-level key: "essay_questions".

      "essay_questions" should be an array of objects, each with:
      - "question_text": string
      - "suggested_points": array of strings (optional, can be empty array if no points are suggested)

      Example format:
      {
        "essay_questions": [
          {
            "question_text": "Discuss the primary causes and effects of the Industrial Revolution on global society.",
            "suggested_points": [
              "Technological innovations (steam engine, textile machinery)",
              "Shift from agrarian to industrial economy",
              "Urbanization and social changes",
              "Economic impacts (capitalism, trade)",
              "Environmental consequences"
            ]
          },
          {
            "question_text": "Analyze the role of photosynthesis in the carbon cycle and its importance for life on Earth.",
            "suggested_points": [
              "Definition of photosynthesis and its inputs/outputs",
              "Role in converting CO2 to organic compounds",
              "Oxygen production and atmospheric composition",
              "Energy flow in ecosystems",
              "Impact on climate regulation"
            ]
          }
        ]
      }

      Here is the combined content from the concepts and their associated study materials:
      ---
      ${combinedContent}
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

    if (!parsedData.essay_questions || !Array.isArray(parsedData.essay_questions)) {
      throw new Error("AI response missing 'essay_questions' array.");
    }

    // Insert generated questions into the database
    const questionsToInsert = parsedData.essay_questions.map((q: any) => ({
      user_id: user.id,
      // If questions are based on multiple concepts/sets, study_set_id remains null
      // If it's clear it's from a single set, you could link it. For now, keep it simple.
      study_set_id: uniqueStudySetIds.size === 1 ? Array.from(uniqueStudySetIds)[0] : null,
      question_text: q.question_text,
      suggested_points: q.suggested_points || null,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('essay_questions')
      .insert(questionsToInsert)
      .select('id, question_text, suggested_points');

    if (insertError) {
      console.error("Error inserting generated essay questions:", insertError);
      throw new Error(`Failed to save generated essay questions: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      message: "Essay questions generated and saved successfully!",
      questions: insertedQuestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in generate-essay-questions function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});