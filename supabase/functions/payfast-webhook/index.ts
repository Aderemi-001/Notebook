import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse the PayFast ITN data
        const formData = await req.formData()
        const data: Record<string, string> = {}

        for (const [key, value] of formData.entries()) {
            data[key] = value.toString()
        }

        console.log('PayFast ITN received:', data)

        // Validate the payment
        const paymentStatus = data.payment_status
        const merchantId = data.merchant_id
        const amount = parseFloat(data.amount_gross || '0')
        const itemName = data.item_name
        const emailAddress = data.email_address

        // Verify it's from PayFast (basic check)
        const expectedMerchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
        if (merchantId !== expectedMerchantId) {
            console.error('Invalid merchant ID')
            return new Response('Invalid merchant', { status: 400 })
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Find the user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

        if (userError) {
            console.error('Error fetching users:', userError)
            return new Response('User lookup failed', { status: 500 })
        }

        const user = userData.users.find((u: any) => u.email === emailAddress)

        if (!user) {
            console.error('User not found:', emailAddress)
            return new Response('User not found', { status: 404 })
        }

        // Update subscription based on payment status
        if (paymentStatus === 'COMPLETE') {
            // Payment successful - activate subscription
            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'active',
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)

            if (updateError) {
                console.error('Error updating subscription:', updateError)
                return new Response('Database update failed', { status: 500 })
            }

            console.log('Subscription activated for user:', user.email)
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
            // Payment failed - mark as expired
            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)

            if (updateError) {
                console.error('Error updating subscription:', updateError)
            }

            console.log('Subscription marked as expired for user:', user.email)
        }

        return new Response('OK', {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('Internal server error', {
            status: 500,
            headers: corsHeaders
        })
    }
})
