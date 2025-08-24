import { serve } from "https://deno.land/std@0.224.0/http/server.ts" // Updated Deno std version
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0' // Removed unused import

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message } = await req.json();
    console.log("Received message:", message);

    // Simulate AI response
    const botResponse = `You said: "${message}". I'm a simple chatbot and can only echo for now!`;

    return new Response(
      JSON.stringify({ response: botResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error processing chatbot request:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})