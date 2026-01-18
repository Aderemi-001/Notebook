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
    custom_str1?: string; // User ID
    m_payment_id?: string; // Merchant Payment ID (our UUID)
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
            console.log('📝 Requesting signature for:', JSON.stringify(data, null, 2));
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
            return result.signature;
        } catch (error) {
            console.error('PayFast Signature Error:', error);
            throw error;
        }
    }

    /**
     * Generic Checkout Handler (Process Payment)
     */
    private async processCheckout(paymentData: Record<string, string | undefined>) {
        // Prepare base data
        const data: Record<string, string> = {
            merchant_id: this.config.merchantId,
            merchant_key: this.config.merchantKey,
            return_url: `${window.location.origin}/payment-result?success=true`,
            cancel_url: `${window.location.origin}/payment-result?canceled=true`,
            notify_url: `${window.location.origin}/api/payfast-itn`,
            ...paymentData,
        } as Record<string, string>; // Cast initially, clean up below

        // Remove empty/null/undefined values required for clean signature
        Object.keys(data).forEach(key => {
            if (data[key] === null || data[key] === undefined || String(data[key]).trim() === '') {
                delete data[key];
            } else {
                data[key] = String(data[key]).trim();
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
     * Create a specific ONE-TIME payment checkout
     */
    async createOneTimeCheckout(paymentData: PayFastPaymentData): Promise<string> {
        return this.processCheckout({
            amount: paymentData.amount,
            item_name: paymentData.item_name,
            item_description: paymentData.item_description,
            email_address: paymentData.email_address,
            name_first: paymentData.name_first,
            name_last: paymentData.name_last,
            custom_str1: paymentData.custom_str1,
            m_payment_id: paymentData.m_payment_id
        });
    }

    /**
     * Create a SUBSCRIPTION checkout
     */
    async createSubscriptionCheckout(paymentData: PayFastPaymentData): Promise<string> {
        return this.processCheckout({
            ...paymentData, // Include basic fields
            // Explicitly ensure subscription fields are passed
            subscription_type: '1',
            billing_date: paymentData.billing_date,
            recurring_amount: paymentData.recurring_amount,
            frequency: paymentData.frequency,
            cycles: paymentData.cycles
        });
    }

    /**
     * Quick checkout for Nova Pro subscription
     */
    async checkoutNovaPro(userEmail: string, userName: string, userId: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
        const [firstName, ...lastNameParts] = userName.split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        if (!this.config.merchantId || !this.config.merchantKey) {
            console.error('PayFast credentials not configured.');
            return;
        }

        const isAnnual = billingCycle === 'annual';
        const price = isAnnual ? '619.99' : '59.99';
        const itemName = isAnnual ? 'Nova Pro Annual Subscription' : 'Nova Pro Monthly Subscription';
        const frequency = isAnnual ? '6' : '3';

        const today = new Date();
        const billingDateObj = new Date(today);

        if (isAnnual) {
            billingDateObj.setFullYear(billingDateObj.getFullYear() + 1);
        } else {
            billingDateObj.setMonth(billingDateObj.getMonth() + 1);
        }

        const billingDate = billingDateObj.toISOString().split('T')[0];

        let transactionId = '';
        try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: txn, error } = await (supabase as any)
                .from('payment_transactions')
                .insert({
                    user_id: userId,
                    amount: parseFloat(price),
                    status: 'pending',
                    provider: 'payfast',
                    metadata: { plan: billingCycle, item: itemName }
                })
                .select()
                .single();

            if (txn) transactionId = txn.id;
            if (error) console.error('Error logging transaction:', error);
        } catch (e) {
            console.warn('Could not log transaction:', e);
        }

        await this.createSubscriptionCheckout({
            amount: price,
            item_name: itemName,
            item_description: `${billingCycle === 'annual' ? 'Annual' : 'Monthly'} subscription to Nova Pro`,
            email_address: userEmail,
            name_first: firstName,
            name_last: lastName,
            custom_str1: userId,
            m_payment_id: transactionId,
            subscription_type: '1',
            billing_date: billingDate,
            recurring_amount: price,
            frequency: frequency,
            cycles: '0',
        });
    }

    /**
     * Checkout for Lifetime Deal (One-time)
     */
    async checkoutNovaLifetime(userEmail: string, userName: string, userId: string) {
        const [firstName, ...lastNameParts] = userName.split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        const price = '1999.00';
        const itemName = 'Nova Pro Lifetime Access';

        let transactionId = '';
        try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: txn, error } = await (supabase as any)
                .from('payment_transactions')
                .insert({
                    user_id: userId,
                    amount: parseFloat(price),
                    status: 'pending',
                    provider: 'payfast',
                    metadata: { plan: 'lifetime', item: itemName }
                })
                .select()
                .single();

            if (txn) transactionId = txn.id;
            if (error) console.error('Error logging transaction:', error);
        } catch (e) {
            console.warn('Txn log failed', e);
        }

        // Use One-Time Checkout method
        await this.createOneTimeCheckout({
            amount: price,
            item_name: itemName,
            item_description: 'Lifetime access to Nova Pro - Pay Once Use Forever', // Removed comma just in case
            email_address: userEmail,
            name_first: firstName,
            name_last: lastName,
            custom_str1: userId,
            m_payment_id: transactionId
        });
    }
    /**
     * Cancels a subscription via the backend API.
     * @param userId The user's ID
     */
    async cancelSubscription(userId: string) {
        try {
            const response = await fetch('/api/payfast-cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.group('Cancellation Fetch Error');
                console.error(`Status: ${response.status} ${response.statusText}`);
                console.error('URL:', response.url);
                console.error('Body:', result);
                console.groupEnd();
                throw new Error(result.error || `Failed to cancel subscription (HTTP ${response.status})`);
            }

            return result;
        } catch (error) {
            console.error('Cancellation Error:', error);
            throw error;
        }
    }
}

export const payfast = new PayFastService();
