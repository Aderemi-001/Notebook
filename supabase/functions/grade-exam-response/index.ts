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

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
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

    const { userAnswer, correctAnswer, questionType } = await req.json();

    if (typeof userAnswer === 'undefined' || !correctAnswer || !questionType) {
      return new Response(JSON.stringify({ error: "Missing userAnswer, correctAnswer, or questionType." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let isCorrect = false;
    let score = 0;
    let aiFeedback = "";

    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      // For these types, a direct string comparison is usually sufficient
      isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      score = isCorrect ? 1 : 0;
      aiFeedback = isCorrect ? "Direct match." : "Incorrect.";
    } else if (questionType === 'short_answer') {
      const prompt = `
        You are an intelligent grader. Compare the "User's Answer" to the "Correct Answer" for a short answer question.
        Determine if the user's answer is semantically correct, even if worded differently.
        Respond with a JSON object containing "is_correct" (boolean) and "feedback" (string).
        If the answer is correct, set "is_correct" to true. Otherwise, set it to false.

        User's Answer: "${userAnswer}"
        Correct Answer: "${correctAnswer}"

        Example correct response:
        {"is_correct": true, "feedback": "The user's answer accurately conveys the meaning of the correct answer."}

        Example incorrect response:
        {"is_correct": false, "feedback": "The user's answer is missing key information or is factually incorrect."}
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
        console.error("Gemini API Error during grading:", errorBody);
        throw new Error(`Gemini API request failed during grading: ${errorBody.error?.message || 'Unknown error'}`);
      }

      const geminiData = await geminiResponse.json();
      let resultText = geminiData.candidates[0].content.parts[0].text;

      if (!resultText) {
        throw new Error("AI failed to generate a grading response.");
      }

      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        resultText = jsonMatch[1];
      }

      let parsedGrading;
      try {
        parsedGrading = JSON.parse(resultText);
      } catch (parseError) {
        console.error("Failed to parse AI grading response as JSON:", resultText, parseError);
        throw new Error("AI returned invalid JSON for grading. Please try again.");
      }

      isCorrect = parsedGrading.is_correct === true; // Ensure it's explicitly true
      score = isCorrect ? 1 : 0;
      aiFeedback = parsedGrading.feedback || "No specific feedback from AI.";

    } else {
      return new Response(JSON.stringify({ error: "Unsupported question type." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ is_correct: isCorrect, score: score, ai_feedback: aiFeedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Error in grade-exam-response function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});