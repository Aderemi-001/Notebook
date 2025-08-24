import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Knowledge base about the application's features
const APP_KNOWLEDGE_BASE = `
The application is a study tool designed to help users learn and organize their study materials.

**Key Features:**

*   **Authentication:** Users can sign up, log in, and sign out. Password reset functionality is available.
*   **Study Sets:**
    *   **Creation:** Users can create new study sets manually by adding term/definition pairs. They can also import content from files (PDF, TXT, CSV, Markdown, JSON, XML, HTML, JS, TS, CSS) using AI to automatically generate flashcards, concepts, and relationships. When importing, the AI can estimate the optimal number of cards.
    *   **Editing:** Existing study sets can be edited, including their title, description, public/private visibility, and assignment to a group. Individual flashcards within a set can also be edited. AI can be used to re-import content from files to update cards.
    *   **Deletion:** Study sets can be permanently deleted.
    *   **Public Sets:** Users can browse and add public study sets created by other users to their personal collection.
    *   **Study Mode:** Users can study flashcards within a specific set using a spaced repetition system (SM-2 algorithm). Cards flip between term and definition. Users rate their recall (Again, Hard, Good) to adjust future review schedules.
*   **Daily Review:** A dedicated section where users can review cards that are due today across all their study sets, based on the spaced repetition algorithm. A daily toast notification reminds users if they have cards due.
*   **Notes:**
    *   **Creation:** Users can create rich text notes, which can optionally be linked to a specific study set.
    *   **Editing:** Existing notes can be edited.
    *   **AI Summarization:** Notes can be summarized using AI to extract key takeaways.
    *   **AI Drawing Analysis:** Drawings or handwritten content within notes (on a canvas) can be analyzed by AI to transcribe text or describe visual information.
    *   **Deletion:** Notes can be deleted.
*   **Exams:**
    *   **Generation:** Users can generate custom exams from a selected study set. They can specify the number of questions and choose from various question types (multiple choice, short answer, true/false).
    *   **Taking Exams:** Users can take the generated exams. The AI grades their responses and provides feedback and a score.
    *   **Past Exams:** Users can review their previous exam attempts and detailed results.
*   **Essay Questions:**
    *   **Generation:** Users can generate essay questions based on selected concepts from their cognitive constellation. The AI provides suggested answer points for each question.
    *   **Practice:** Users can write essay responses and receive AI feedback and a score based on the suggested points.
    *   **Past Essay Questions:** Users can review previously generated essay questions and their practice attempts.
*   **Cognitive Constellation:** This feature provides a visual representation of interconnected concepts extracted by AI from the user's study materials (e.g., imported files). Users can refresh the constellation to update it with new content.
*   **Study Set Groups:** Users can organize their study sets into custom groups for better management. Groups can be created, edited, and deleted. Existing study sets can be added to or removed from groups.
*   **User Profile & Settings:**
    *   **Profile:** Users can update their display name.
    *   **Settings:** Users can configure application preferences, including:
        *   Default flashcard side (term first or definition first).
        *   Confirmation prompt for deleting items.
        *   Default number of exam questions.
        *   Default exam question types.
        *   Daily cards goal for review sessions.
        *   Enable/disable daily review reminders.
    *   **Statistics:** Users can view their study statistics, including total study sets, total cards, mastered cards, cards due for review, and a study calendar with streak tracking.
*   **Collaborations:** This feature is currently under development ("Under Construction").

**How to use the app:**

*   **To create a study set:** Navigate to the "Create Set" page. You can manually add cards or upload a file (PDF, TXT, etc.) and use AI to generate cards.
*   **To study cards:** Go to a specific study set's detail page and click "Start Study," or visit the "Daily Review" page for cards due today.
*   **To create a note:** Go to "My Notes" and click "Create New Note." You can link it to a study set.
*   **To generate an exam:** Go to the "Generate Exam" page, select a study set, choose the number and types of questions, and click "Generate Questions."
*   **To generate essay questions:** Go to the "Generate Essay Questions" page, select concepts, and click "Generate Essay Questions."
*   **To view your cognitive constellation:** Navigate to the "Cognitive Constellation" page.
*   **To manage groups:** Go to "My Groups."
*   **To change settings:** Go to "Profile" then "App Settings."
*   **To view statistics:** Go to "Profile" then "Statistics."
*   **To sign out:** Go to "Profile" and select "Sign Out" from the dropdown menu.

Please answer user questions concisely and directly based on this knowledge base. If a feature is "Under Construction," state that clearly. If the question is outside the scope of the application's features, politely state that you can only answer questions about the app.
`;

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

    const { message: user_query } = await req.json(); // Renamed 'message' to 'user_query'

    if (!user_query || typeof user_query !== 'string' || !user_query.trim()) {
      return new Response(JSON.stringify({ error: "No user query provided." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const prompt = `
      You are a helpful assistant for a study application called "My Notebook".
      Your goal is to answer user questions about how to use the application's features.
      Use the provided knowledge base below to answer questions.
      If a feature is "Under Construction", state that clearly.
      If the question is outside the scope of the application's features, politely state that you can only answer questions about the app.
      Keep your answers concise and to the point.

      **Application Knowledge Base:**
      ${APP_KNOWLEDGE_BASE}

      **User Question:**
      ${user_query}

      **Your Answer:**
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
    const chatbot_response = geminiData.candidates[0].content.parts[0].text;

    if (!chatbot_response) {
      throw new Error("AI failed to generate a response.");
    }

    return new Response(JSON.stringify({ response: chatbot_response }), { // Changed key to 'response'
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Error in chatbot function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});