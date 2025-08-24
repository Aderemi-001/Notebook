import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0' // Removed as it's not used

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => { // Explicitly typed 'req'
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
  } catch (error: unknown) { // Explicitly typed 'error' as unknown
    console.error("Error processing chatbot request:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }), // Type assertion for error.message
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})