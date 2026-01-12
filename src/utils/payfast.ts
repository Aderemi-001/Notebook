/**
 * PayFast Integration for South African Payments
 * Docs: https://developers.payfast.co.za/docs
 */



interface PayFastConfig {
    merchantId: string;
    merchantKey: string;
    passphrase: string;
    sandbox: boolean;
}

interface PayFastPaymentData {
    amount: string;
    item_name: string;
    item_description: string;
    email_address: string;
    name_first: string;
    name_last: string;
    subscription_type?: '1'; // 1 = subscription
    billing_date?: string; // YYYY-MM-DD
    recurring_amount?: string;
    frequency?: '3' | '6'; // 3 = monthly, 6 = annual
    cycles?: '0'; // 0 = indefinite
}

export class PayFastService {
    private config: PayFastConfig;
    private baseUrl: string;

    constructor() {
        this.config = {
            merchantId: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '',
            merchantKey: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '',
            passphrase: '', // MOVED TO BACKEND (api/payfast.ts)
            sandbox: import.meta.env.VITE_PAYFAST_SANDBOX === 'true',
        };

        this.baseUrl = this.config.sandbox
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process';
    }

    /**
     * Generate signature securely via Backend API
     */
    private async generateSignature(data: Record<string, string>): Promise<string> {
        try {
            const response = await fetch('/api/payfast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('PayFast API Error details:', errorText);
                throw new Error(`Failed to generate signature: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();

            console.group('🔐 PayFast Signature Debug');
            console.log('Passphrase Configured on Server:', result.passphraseConfigured ? '✅ YES' : '❌ NO');
            console.log('String Hashed by Server:', result.debugString);
            console.log('Generated Signature:', result.signature);
            console.groupEnd();

            return result.signature;
        } catch (error) {
            console.error('PayFast Signature Error:', error);
            throw error;
        }
    }

    /**
     * Create a subscription checkout
     */
    async createSubscriptionCheckout(paymentData: PayFastPaymentData): Promise<string> {
        const data: Record<string, string> = {
            merchant_id: this.config.merchantId,
            merchant_key: this.config.merchantKey,
            return_url: `${window.location.origin}/payment-result?success=true`,
            cancel_url: `${window.location.origin}/payment-result?canceled=true`,
            notify_url: 'https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/payfast-webhook',
            ...paymentData,
        };

        // Remove empty/null/undefined values to match PayFast signature rules
        Object.keys(data).forEach(key => {
            if (data[key] === null || data[key] === undefined || data[key] === '') {
                delete data[key];
            } else {
                // Ensure strings are trimmed
                data[key] = data[key].trim();
            }
        });

        // Generate signature on server
        const signature = await this.generateSignature(data);
        data.signature = signature;

        // Build form and auto-submit
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.baseUrl;

        Object.keys(data).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();

        return this.baseUrl;
    }

    /**
     * Quick checkout for Nova Pro subscription
     */
    async checkoutNovaPro(userEmail: string, userName: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
        const [firstName, ...lastNameParts] = userName.split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        // Validate credentials
        if (!this.config.merchantId || !this.config.merchantKey) {
            console.error('PayFast credentials not configured.');
            return;
        }

        console.log(`Initiating PayFast checkout for ${billingCycle}...`);

        // Pricing Configuration
        const isAnnual = billingCycle === 'annual';
        const price = isAnnual ? '619.99' : '15.00';
        const itemName = isAnnual ? 'Nova Pro Annual Subscription' : 'Nova Pro Monthly Subscription';
        const frequency = isAnnual ? '6' : '3'; // 3 = Monthly, 6 = Annual

        // Calculate billing date (tomorrow)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const billingDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

        await this.createSubscriptionCheckout({
            amount: price,
            item_name: itemName,
            item_description: `${billingCycle === 'annual' ? 'Annual' : 'Monthly'} subscription to Nova Pro - Unlimited AI study tools`,
            email_address: userEmail,
            name_first: firstName,
            name_last: lastName,
            subscription_type: '1',
            billing_date: billingDate,
            recurring_amount: price,
            frequency: frequency,
            cycles: '0', // Indefinite
        });
    }
}

export const payfast = new PayFastService();
