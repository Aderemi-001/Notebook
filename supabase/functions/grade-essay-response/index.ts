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

    const { essayQuestionId, userAnswerText } = await req.json();

    if (!essayQuestionId || !userAnswerText) {
      return new Response(JSON.stringify({ error: "Missing essayQuestionId or userAnswerText." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the essay question details, including suggested points
    const { data: essayQuestion, error: fetchQuestionError } = await supabase
      .from('essay_questions')
      .select('question_text, suggested_points')
      .eq('id', essayQuestionId)
      .single();

    if (fetchQuestionError) {
      console.error("Error fetching essay question:", fetchQuestionError);
      return new Response(JSON.stringify({ error: `Failed to fetch essay question: ${fetchQuestionError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!essayQuestion) {
      return new Response(JSON.stringify({ error: "Essay question not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const questionText = essayQuestion.question_text;
    const suggestedPoints = essayQuestion.suggested_points ? essayQuestion.suggested_points.join('\n- ') : 'No specific points suggested.';

    const prompt = `
      You are an expert essay grader. Evaluate the "User's Essay Answer" against the "Essay Question" and its "Suggested Points".
      Provide a score from 0 to 100, a summary feedback, and detailed feedback in JSON format.

      The detailed feedback should include:
      - "points_covered": An array of strings, listing which of the suggested points (or similar concepts) were adequately addressed.
      - "points_missed": An array of strings, listing which suggested points were not addressed or were poorly explained.
      - "overall_strengths": A string describing the overall strengths of the answer.
      - "areas_for_improvement": A string describing areas where the answer could be improved.

      The output must be a single, valid JSON object. Do not wrap it in markdown backticks or add any other text.
      The JSON object should have the following top-level keys: "score", "summary_feedback", and "detailed_feedback".

      Essay Question: "${questionText}"
      Suggested Points:
      - ${suggestedPoints}

      User's Essay Answer:
      ---
      ${userAnswerText}
      ---

      Example JSON response:
      {
        "score": 85,
        "summary_feedback": "A strong answer that covers most key aspects, but could elaborate more on X.",
        "detailed_feedback": {
          "points_covered": ["Point 1", "Point 3"],
          "points_missed": ["Point 2"],
          "overall_strengths": "Well-structured and clear arguments.",
          "areas_for_improvement": "Expand on the implications of Y."
        }
      }
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
      console.error("Gemini API Error during essay grading:", errorBody);
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

    // Validate parsed data structure
    if (typeof parsedGrading.score !== 'number' || typeof parsedGrading.summary_feedback !== 'string' || typeof parsedGrading.detailed_feedback !== 'object') {
      throw new Error("AI returned an unexpected grading format.");
    }

    return new Response(JSON.stringify({
      score: parsedGrading.score,
      summary_feedback: parsedGrading.summary_feedback,
      detailed_feedback: parsedGrading.detailed_feedback,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Error in grade-essay-response function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});