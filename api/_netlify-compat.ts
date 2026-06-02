import { Buffer } from 'buffer';

export function makeNetlifyHandler(vercelHandler: (req: any, res: any) => Promise<any> | any) {
    return async (event: any, context: any) => {
        // Construct a mock VercelRequest-like object from Netlify's event
        let body = {};
        if (event.body) {
            try {
                // Netlify body is a string or base64 encoded
                const isBase64 = event.isBase64Encoded;
                const rawBody = isBase64 ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
                
                const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
                
                // If it's JSON, parse it
                if (contentType.includes('application/json')) {
                    body = JSON.parse(rawBody);
                } else {
                    // Try parsing as URLSearchParams (for forms/webhooks like PayFast ITN)
                    const params = new URLSearchParams(rawBody);
                    const parsed: Record<string, string> = {};
                    let hasKeys = false;
                    for (const [k, v] of params.entries()) {
                        parsed[k] = v;
                        hasKeys = true;
                    }
                    body = hasKeys ? parsed : rawBody;
                }
            } catch (e) {
                // If parsing fails, fall back to raw body
                body = event.body;
            }
        }

        const req = {
            method: event.httpMethod,
            headers: event.headers || {},
            body: body,
            query: event.queryStringParameters || {},
            url: event.path,
            rawBody: event.body
        };

        // Construct a mock VercelResponse-like object
        let responseStatus = 200;
        let responseHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': event.headers.origin || event.headers.Origin || '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
            'Access-Control-Max-Age': '86400'
        };
        let responseBody: any = '';

        const res = {
            status(code: number) {
                responseStatus = code;
                return this;
            },
            setHeader(key: string, value: string) {
                responseHeaders[key] = value;
                return this;
            },
            json(data: any) {
                responseHeaders['Content-Type'] = 'application/json';
                responseBody = JSON.stringify(data);
                return this;
            },
            send(data: any) {
                responseBody = typeof data === 'string' ? data : JSON.stringify(data);
                return this;
            },
            end() {
                return this;
            }
        };

        try {
            await vercelHandler(req as any, res as any);
        } catch (err: any) {
            console.error('Error in Vercel handler execution:', err);
            responseStatus = 500;
            responseBody = JSON.stringify({ error: err.message || 'Internal Server Error' });
        }

        return {
            statusCode: responseStatus,
            headers: responseHeaders,
            body: responseBody
        };
    };
}
