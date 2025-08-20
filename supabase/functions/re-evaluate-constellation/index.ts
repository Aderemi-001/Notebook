import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch all concepts and relationships for the current user
    const { data: concepts, error: conceptsError } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('user_id', user.id);

    if (conceptsError) throw conceptsError;

    const { data: relationships, error: relationshipsError } = await supabase
      .from('concept_relationships')
      .select('source_concept_id, target_concept_id, type, strength')
      .eq('user_id', user.id);

    if (relationshipsError) throw relationshipsError;

    return new Response(JSON.stringify({ concepts, relationships }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in re-evaluate-constellation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});