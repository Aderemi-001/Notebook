import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeNetlifyHandler } from './_netlify-compat';

const PASSPHRASE = process.env.PAYFAST_PASSPHRASE;

export default function payfastHandler(req: VercelRequest, res: VercelResponse) {
    console.log('[PayFast API] Handler started');
    console.log('[PayFast API] Method:', req.method);
    console.log('[PayFast API] Origin:', req.headers.origin);

    // Set CORS headers for all requests
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        console.log('[PayFast API] Handling OPTIONS preflight');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.log('[PayFast API] Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data = req.body || {};
        console.log('[PayFast API] Body received:', JSON.stringify(data));

        // Helper to mimic PHP's urlencode exactly (PayFast requirement)
        // strict encoding: spaces to +, special chars to %XX
        const pfUrlEncode = (str: string) => {
            return encodeURIComponent(str)
                .replace(/[!'()*~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
                .replace(/%20/g, '+');
        };

        // 1. Filter out empty/null values and signature field
        const cleanData: Record<string, string> = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (key !== 'signature' && value !== undefined && value !== null && String(value).trim() !== '') {
                cleanData[key] = String(value).trim();
            }
        });

        // 2. Build Query String in PayFast's REQUIRED ORDER
        // CRITICAL: PayFast does NOT use alphabetical ordering!
        // Order must be: merchant details → buyer details → transaction details → subscription details
        const orderedKeys = [
            // M_PAYMENT_ID MUST BE FIRST in transaction/custom section for some integrations, 
            // but standard docs say: merchant -> buyer -> transaction -> custom -> subscription
            // Let's follow the PayFast ITN order which is known to work for others:

            // 1. Merchant Details
            'merchant_id',
            'merchant_key',
            'return_url',
            'cancel_url',
            'notify_url',

            // 2. Buyer Details
            'name_first',
            'name_last',
            'email_address',
            'cell_number',

            // 3. Transaction Details
            'm_payment_id', // Moved up to join transaction details
            'amount',
            'item_name',
            'item_description',

            // 4. Custom Integers (1-5)
            'custom_int1',
            'custom_int2',
            'custom_int3',
            'custom_int4',
            'custom_int5',

            // 5. Custom Strings (1-5)
            'custom_str1',
            'custom_str2',
            'custom_str3',
            'custom_str4',
            'custom_str5',

            // 6. Subscription Details (Must be last for subscriptions)
            'subscription_type',
            'billing_date',
            'recurring_amount',
            'frequency',
            'cycles'
        ];

        // Build param string using ONLY the keys that exist in cleanData, in the correct order
        const paramString = orderedKeys
            .filter(key => key in cleanData)
            .map(key => `${key}=${pfUrlEncode(cleanData[key])}`)
            .join('&');

        console.log(`[PayFast API] Using Passphrase: ${PASSPHRASE ? 'YES' : 'NO'}`);

        // 3. Append passphrase if it exists
        const signatureString = PASSPHRASE
            ? `${paramString}&passphrase=${pfUrlEncode(PASSPHRASE.trim())}`
            : paramString;

        // Debug: Log the string being hashed (masking sensitive info)
        const maskedDebugString = signatureString
            .replace(/passphrase=[^&]*/, 'passphrase=***')
            .replace(/merchant_key=[^&]*/, 'merchant_key=***');

        console.log(`[PayFast API] String to Hash: ${maskedDebugString}`);

        // 4. Generate MD5 signature
        const signature = crypto.createHash('md5').update(signatureString).digest('hex');
        console.log('[PayFast API] Signature generated:', signature);

        return res.status(200).json({
            signature,
            debugString: maskedDebugString,
            passphraseConfigured: !!PASSPHRASE
        });

    } catch (error: any) {
        console.error('[PayFast API] Critical Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            stack: error.stack
        });
    }
}

export const handler = makeNetlifyHandler(payfastHandler);
