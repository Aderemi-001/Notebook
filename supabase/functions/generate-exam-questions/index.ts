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

    const { studySetId, numQuestions, questionTypes } = await req.json();

    if (!studySetId) {
      return new Response(JSON.stringify({ error: "studySetId is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the source_text from the specified study set
    const { data: studySet, error: fetchSetError } = await supabase
      .from('study_sets')
      .select('source_text, title')
      .eq('id', studySetId)
      .eq('user_id', user.id) // Ensure user owns the set
      .single();

    if (fetchSetError) {
      console.error("Error fetching study set source text:", fetchSetError);
      return new Response(JSON.stringify({ error: `Failed to fetch study set: ${fetchSetError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!studySet || !studySet.source_text) {
      return new Response(JSON.stringify({ error: "Study set not found or has no source text for question generation." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const content = studySet.source_text;
    const setTitle = studySet.title;

    const prompt = `
      You are an expert at generating diverse exam questions and their answers from provided text.
      Based on the following text from the study set titled "${setTitle}", generate ${numQuestions || 5} questions.
      Prioritize the following question types: ${questionTypes && questionTypes.length > 0 ? questionTypes.join(', ') : 'multiple_choice, short_answer, true_false'}.

      For each question, provide the question text, the correct answer, and its type.
      If the question type is 'multiple_choice', also provide an array of 'options' including the correct answer and several plausible distractors. Ensure there are at least 3 options for multiple-choice questions.
      If the question type is 'true_false', the answer should be 'True' or 'False'.

      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have one top-level key: "questions".

      "questions" should be an array of objects, each with:
      - "question_text": string
      - "answer_text": string
      - "question_type": string (e.g., "multiple_choice", "short_answer", "true_false")
      - "options": array of strings (only for "multiple_choice" type)

      Example format:
      {
        "questions": [
          {
            "question_text": "What is the capital of France?",
            "answer_text": "Paris",
            "question_type": "short_answer"
          },
          {
            "question_text": "The Eiffel Tower is located in Rome. (True/False)",
            "answer_text": "False",
            "question_type": "true_false"
          },
          {
            "question_text": "Which of the following is a primary color?",
            "answer_text": "Blue",
            "question_type": "multiple_choice",
            "options": ["Red", "Green", "Blue", "Yellow"]
          }
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

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error("AI response missing 'questions' array.");
    }

    // Insert generated questions into the database
    const questionsToInsert = parsedData.questions.map((q: any) => ({
      user_id: user.id,
      set_id: studySetId,
      question_text: q.question_text,
      answer_text: q.answer_text,
      question_type: q.question_type,
      options: q.options || null,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('generated_questions')
      .insert(questionsToInsert)
      .select('id, question_text, answer_text, question_type, options');

    if (insertError) {
      console.error("Error inserting generated questions:", insertError);
      throw new Error(`Failed to save generated questions: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      message: "Questions generated and saved successfully!",
      questions: insertedQuestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in generate-exam-questions function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});