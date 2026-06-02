import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { makeNetlifyHandler } from './_netlify-compat';

const PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
// Support Vercel integration and custom environment variable formats
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://juosdmecldzlvrinnzwf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;

// Initialize Supabase Admin Client
const getSupabaseAdmin = () => {
    if (!SUPABASE_SERVICE_KEY || !SUPABASE_URL) {
        console.error('❌ Missing Supabase credentials in webhook handler.');
        return null;
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
};

export default async function payfastItnHandler(req: VercelRequest, res: VercelResponse) {
    try {
        console.log('[PayFast ITN] Received notification');

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const rawData = req.body || {};
        const dataMap = new Map<string, string>();
        
        // Fallback: Parse URL-encoded body if it was not parsed automatically
        if (!req.body || Object.keys(req.body).length === 0) {
            const rawBody = (req as any).rawBody || req.body;
            let bodyStr = '';
            if (typeof rawBody === 'string') {
                bodyStr = rawBody;
            } else if (Buffer.isBuffer(rawBody)) {
                bodyStr = rawBody.toString('utf-8');
            }
            if (bodyStr) {
                try {
                    const params = new URLSearchParams(bodyStr);
                    for (const [key, value] of params.entries()) {
                        dataMap.set(key, value);
                    }
                } catch (e) {
                    console.error('[PayFast ITN] Failed to parse raw body:', e);
                }
            }
        } else {
            // Populate from req.body object safely using Object.entries to avoid bracket notation
            for (const [key, val] of Object.entries(rawData)) {
                if (val !== undefined && val !== null) {
                    dataMap.set(key, String(val));
                }
            }
        }

        console.log('[PayFast ITN] Payload size:', dataMap.size);

        if (dataMap.size === 0) {
            console.error('❌ Empty payload received');
            return res.status(400).send('Empty payload');
        }

        // 1. Verify Signature
        // Filter out empty/null values and signature field
        const cleanData = new Map<string, string>();
        for (const [key, value] of dataMap.entries()) {
            if (key !== 'signature' && value !== undefined && value !== null && value.trim() !== '') {
                cleanData.set(key, value.trim());
            }
        }

        // PayFast's EXACT Parameter Order for ITN verification
        const orderedKeys = [
            'merchant_id',
            'merchant_key',
            'return_url',
            'cancel_url',
            'notify_url',
            'name_first',
            'name_last',
            'email_address',
            'cell_number',
            'm_payment_id',
            'amount',
            'item_name',
            'item_description',
            'amount_gross',
            'amount_fee',
            'amount_net',
            'custom_int1',
            'custom_int2',
            'custom_int3',
            'custom_int4',
            'custom_int5',
            'custom_str1',
            'custom_str2',
            'custom_str3',
            'custom_str4',
            'custom_str5',
            'name_first_secondary',
            'name_last_secondary',
            'email_address_secondary',
            'cell_number_secondary',
            'payment_status',
            'pf_payment_id',
            'subscription_type',
            'billing_date',
            'recurring_amount',
            'frequency',
            'cycles',
            'token',
            'date'
        ];

        // Helper to mimic PHP's urlencode exactly (PayFast requirement)
        const pfUrlEncode = (str: string) => {
            return encodeURIComponent(str)
                .replace(/[!'()*~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
                .replace(/%20/g, '+');
        };

        // Build parameter string using only keys present in cleanData
        const paramString = orderedKeys
            .filter(key => cleanData.has(key))
            .map(key => `${key}=${pfUrlEncode(cleanData.get(key) || '')}`)
            .join('&');

        // Append passphrase if configured
        const signatureString = PASSPHRASE
            ? `${paramString}&passphrase=${pfUrlEncode(PASSPHRASE.trim())}`
            : paramString;

        const signature = crypto.createHash('md5').update(signatureString).digest('hex');
        const receivedSignature = String(dataMap.get('signature') || '').trim();

        const signaturesMatch = signature === receivedSignature;
        if (!signaturesMatch) {
            console.warn('⚠️ [PayFast ITN] Signature mismatch!');
            console.warn('Generated string:', signatureString);
            console.warn('Generated hash:', signature);
            console.warn('Received hash:', receivedSignature);

            // Check if sandbox or test environment
            const isSandbox = process.env.VITE_PAYFAST_SANDBOX === 'true' || 
                              dataMap.get('merchant_id') === '10000100' || 
                              dataMap.get('merchant_id') === '10004002';
            if (!isSandbox) {
                console.error('❌ [PayFast ITN] Signature verification failed in production. Aborting.');
                return res.status(400).send('Invalid signature');
            } else {
                console.log('⚠️ [PayFast ITN] Signature mismatch bypassed for sandbox/testing.');
            }
        } else {
            console.log('✅ [PayFast ITN] Signature verified successfully.');
        }

        // 2. Check Payment Status
        const paymentStatus = String(dataMap.get('payment_status') || '').toUpperCase();
        if (paymentStatus === 'COMPLETE') {
            const userId = dataMap.get('custom_str1');
            const email = dataMap.get('email_address');

            console.log(`[PayFast ITN] Processing COMPLETE payment for User: ${userId} (${email})`);

            if (!userId) {
                console.error('❌ No User ID found in custom_str1');
                return res.status(200).send('OK'); // Return OK to prevent retries
            }

            const supabaseAdmin = getSupabaseAdmin();
            if (!supabaseAdmin) {
                console.error('❌ Database update skipped: missing server keys');
                return res.status(500).send('Missing server keys');
            }

            // 3. Update Subscription in Supabase
            const paidAmount = parseFloat(dataMap.get('amount_gross') || dataMap.get('amount') || '0');
            let planId = 'pro-monthly';
            let durationDays = 30;

            if (paidAmount > 1500) {
                planId = 'pro-lifetime';
                durationDays = 365 * 100; // 100 Years
            } else if (paidAmount > 100) {
                planId = 'pro-annual';
                durationDays = 365;
            }

            const { error: subError } = await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    status: 'active',
                    plan_id: planId,
                    payfast_token: dataMap.get('token') || null,
                    current_period_end: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (subError) {
                console.error('Error updating subscriptions table:', subError);
            } else {
                console.log('✅ Subscriptions table updated.');
            }

            // Update 'profiles' table user metadata (if needed by frontend cache)
            const { error: userError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { user_metadata: { is_pro: true, subscription_status: 'active' } }
            );

            if (userError) {
                console.error('Error updating user metadata:', userError);
            } else {
                console.log('✅ User metadata updated.');
            }

            // Update transaction log status to 'completed'
            const mPaymentId = dataMap.get('m_payment_id');
            const pfPaymentId = dataMap.get('pf_payment_id');
            if (mPaymentId) {
                const { error: txnError } = await supabaseAdmin
                    .from('payment_transactions')
                    .update({
                        status: 'completed',
                        provider_ref: pfPaymentId || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', mPaymentId);

                if (txnError) console.error('Error closing transaction log:', txnError);
                else console.log('✅ Transaction log marked completed.');
            } else {
                // Fallback: insert completed transaction log
                await supabaseAdmin.from('payment_transactions').insert({
                    user_id: userId,
                    amount: paidAmount,
                    status: 'completed',
                    provider: 'payfast',
                    provider_ref: pfPaymentId || null
                });
            }

        } else {
            console.log(`[PayFast ITN] Payment status: ${paymentStatus} (Not processing subscription update)`);
            
            // Log failed or cancelled transactions in the database
            const mPaymentId = dataMap.get('m_payment_id');
            const pfPaymentId = dataMap.get('pf_payment_id');
            if (mPaymentId && (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED')) {
                const supabaseAdmin = getSupabaseAdmin();
                if (supabaseAdmin) {
                    const { error: txnError } = await supabaseAdmin
                        .from('payment_transactions')
                        .update({
                            status: paymentStatus.toLowerCase(),
                            provider_ref: pfPaymentId || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', mPaymentId);

                    if (txnError) console.error('Error updating transaction status:', txnError);
                    else console.log(`✅ Transaction log marked ${paymentStatus.toLowerCase()}.`);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[PayFast ITN] Critical handler error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

export const handler = makeNetlifyHandler(payfastItnHandler);
