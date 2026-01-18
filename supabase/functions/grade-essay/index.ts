// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const { question, context, essay } = await req.json();

        if (!question || !essay) {
            return new Response(JSON.stringify({ error: "Missing question or essay text." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const prompt = `
You are an expert essay grader. Evaluate the student's essay answer based on the question and context provided.

Essay Question: "${question}"
Context: ${context || 'General understanding of the topic'}

Student's Essay:
---
${essay}
---

Provide a comprehensive grade in JSON format with:
- "score": A number from 0 to 100
- "feedback": Overall feedback paragraph (2-3 sentences)
- "strengths": Array of 3 specific strengths found in the essay
- "improvements": Array of 3 specific areas for improvement

Grade based on:
1. Content accuracy and depth (40%)
2. Organization and structure (20%)
3. Critical thinking and analysis (20%)
4. Writing quality and clarity (20%)

Be strict but fair. A good essay should score 75-85, excellent 85-95, and only truly exceptional work scores above 95.
Poor essays with minimal effort, incorrect information, or lack of understanding should score below 60.

Return ONLY valid JSON in this exact format:
{
  "score": 75,
  "feedback": "Your essay demonstrates a solid understanding...",
  "strengths": ["Clear thesis statement", "Good use of examples", "Logical flow"],
  "improvements": ["Expand on key concepts", "Add more analysis", "Strengthen conclusion"]
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
            console.error("Gemini API Error:", errorBody);
            throw new Error(`Gemini API request failed: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const geminiData = await geminiResponse.json();
        let resultText = geminiData.candidates[0].content.parts[0].text;

        if (!resultText) {
            throw new Error("AI failed to generate a grading response.");
        }

        // Extract JSON from markdown if present
        const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            resultText = jsonMatch[1];
        }

        let parsedGrade;
        try {
            parsedGrade = JSON.parse(resultText);
        } catch (parseError) {
            console.error("Failed to parse AI grading response:", resultText, parseError);
            throw new Error("AI returned invalid JSON for grading. Please try again.");
        }

        // Validate structure
        if (
            typeof parsedGrade.score !== 'number' ||
            typeof parsedGrade.feedback !== 'string' ||
            !Array.isArray(parsedGrade.strengths) ||
            !Array.isArray(parsedGrade.improvements)
        ) {
            throw new Error("AI returned an unexpected grading format.");
        }

        return new Response(JSON.stringify({
            grade: parsedGrade
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        console.error("Error in grade-essay function:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
