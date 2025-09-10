/// <reference types="../deno.d.ts" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: inviter } } = await supabase.auth.getUser();
    if (!inviter) {
      return new Response(JSON.stringify({ error: "Inviter not authenticated." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { studySetId, inviteeEmail, permissionLevel } = await req.json();

    if (!studySetId || !inviteeEmail || !permissionLevel) {
      return new Response(JSON.stringify({ error: "Missing studySetId, inviteeEmail, or permissionLevel." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Verify inviter owns the study set
    const { data: studySet, error: studySetError } = await supabase
      .from('study_sets')
      .select('id, user_id, title')
      .eq('id', studySetId)
      .eq('user_id', inviter.id)
      .single();

    if (studySetError || !studySet) {
      console.error("Error fetching study set or inviter does not own it:", studySetError);
      return new Response(JSON.stringify({ error: "Study set not found or you do not have permission to invite collaborators." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // 2. Find invitee user by email
    const { data: inviteeProfile, error: inviteeProfileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('email', inviteeEmail) // Assuming email is stored in profiles or can be joined
      .single();

    if (inviteeProfileError || !inviteeProfile) {
      console.error("Error finding invitee profile:", inviteeProfileError);
      return new Response(JSON.stringify({ error: "Invitee user not found. Please ensure the email is correct and the user has an account." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const inviteeId = inviteeProfile.id;

    // 3. Prevent inviting self
    if (inviter.id === inviteeId) {
      return new Response(JSON.stringify({ error: "You cannot send a collaboration invitation to yourself." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 4. Check for existing pending/accepted invitation
    const { data: existingInvitation, error: existingInvitationError } = await supabase
      .from('study_set_collaborators')
      .select('id, status')
      .eq('study_set_id', studySetId)
      .eq('invitee_id', inviteeId)
      .in('status', ['pending', 'accepted']);

    if (existingInvitationError) {
      console.error("Error checking for existing invitation:", existingInvitationError);
      throw new Error(`Failed to check for existing invitation: ${existingInvitationError.message}`);
    }

    if (existingInvitation && existingInvitation.length > 0) {
      const status = existingInvitation[0].status;
      if (status === 'pending') {
        return new Response(JSON.stringify({ error: "An invitation to this user for this study set is already pending." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      } else if (status === 'accepted') {
        return new Response(JSON.stringify({ error: "This user is already a collaborator on this study set." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
    }

    // 5. Insert new invitation
    const { data: newInvitation, error: insertError } = await supabase
      .from('study_set_collaborators')
      .insert({
        study_set_id: studySetId,
        inviter_id: inviter.id,
        invitee_id: inviteeId,
        permission_level: permissionLevel,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting new invitation:", insertError);
      throw new Error(`Failed to send invitation: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      message: "Collaboration invitation sent successfully!",
      invitation: newInvitation,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Error in send-collaboration-invitation function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});