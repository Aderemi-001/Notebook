import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'none';

export const useSubscription = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus>('none');
    const [loading, setLoading] = useState(true);
    const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);

    useEffect(() => {
        if (!user) {
            setStatus('none');
            setLoading(false);
            return;
        }

        const fetchSubscription = async () => {
            try {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    const trialEnd = new Date(data.trial_ends_at);
                    setTrialEndsAt(trialEnd);

                    // Check if trial is expired
                    if (data.status === 'trialing' && trialEnd < new Date()) {
                        setStatus('expired');
                    } else {
                        setStatus(data.status as SubscriptionStatus);
                    }
                } else {
                    setStatus('none');
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
                setStatus('none');
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    const isPremium = status === 'active' || status === 'trialing';

    return { status, loading, isPremium, trialEndsAt };
};
