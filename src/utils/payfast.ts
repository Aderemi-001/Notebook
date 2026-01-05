/**
 * PayFast Integration for South African Payments
 * Docs: https://developers.payfast.co.za/docs
 */

import md5 from 'crypto-js/md5';

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
    frequency?: '3'; // 3 = monthly
    cycles?: '0'; // 0 = indefinite
}

export class PayFastService {
    private config: PayFastConfig;
    private baseUrl: string;

    constructor() {
        this.config = {
            merchantId: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '',
            merchantKey: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '',
            passphrase: import.meta.env.VITE_PAYFAST_PASSPHRASE || '',
            sandbox: import.meta.env.VITE_PAYFAST_SANDBOX === 'true',
        };

        this.baseUrl = this.config.sandbox
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process';
    }

    /**
     * Generate signature for PayFast payment
     */
    private generateSignature(data: Record<string, string>): string {
        // Create parameter string
        const paramString = Object.keys(data)
            .sort()
            .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
            .join('&');

        // Append passphrase if set
        const signatureString = this.config.passphrase
            ? `${paramString}&passphrase=${encodeURIComponent(this.config.passphrase)}`
            : paramString;

        return md5(signatureString).toString();
    }

    /**
     * Create a subscription checkout
     */
    createSubscriptionCheckout(paymentData: PayFastPaymentData): string {
        const data: Record<string, string> = {
            merchant_id: this.config.merchantId,
            merchant_key: this.config.merchantKey,
            return_url: `${window.location.origin}/payment-result?success=true`,
            cancel_url: `${window.location.origin}/payment-result?canceled=true`,
            notify_url: `${window.location.origin}/api/payfast-webhook`, // You'll need to create this endpoint
            ...paymentData,
        };

        const signature = this.generateSignature(data);
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
    checkoutNovaPro(userEmail: string, userName: string) {
        const [firstName, ...lastNameParts] = userName.split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        // Validate credentials
        if (!this.config.merchantId || !this.config.merchantKey) {
            alert('PayFast credentials not configured. Please check your .env.local file.');
            console.error('Missing PayFast credentials');
            return;
        }

        console.log('Initiating PayFast checkout with:', {
            merchantId: this.config.merchantId,
            sandbox: this.config.sandbox,
            email: userEmail
        });

        this.createSubscriptionCheckout({
            amount: '99.99', // R99.99/month
            item_name: 'Nova Pro Monthly Subscription',
            item_description: 'Monthly subscription to Nova Pro - Unlimited AI study tools',
            email_address: userEmail,
            name_first: firstName,
            name_last: lastName,
            subscription_type: '1',
            recurring_amount: '99.99',
            frequency: '3', // Monthly
            cycles: '0', // Indefinite
        });
    }
}

export const payfast = new PayFastService();
