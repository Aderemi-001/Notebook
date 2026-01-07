
import md5 from 'crypto-js/md5';

export const config = {
    runtime: 'edge',
};

const PASSPHRASE = process.env.PAYFAST_PASSPHRASE;

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const data = await request.json();

        // 1. Sort the object by key
        // 2. Create parameter string: key=value&key2=value2
        const paramString = Object.keys(data)
            .filter(key => key !== 'signature') // Ensure signature isn't in the data being signed
            .sort()
            .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
            .join('&');

        // 3. Append passphrase if it exists
        const signatureString = PASSPHRASE
            ? `${paramString}&passphrase=${encodeURIComponent(PASSPHRASE)}`
            : paramString;

        // 4. Generate MD5 signature
        const signature = md5(signatureString).toString();

        return new Response(JSON.stringify({ signature }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('PayFast Signature Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
