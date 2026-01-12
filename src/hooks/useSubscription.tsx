import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'none';

interface SubscriptionContextType {
    status: SubscriptionStatus;
    loading: boolean;
    isPremium: boolean;
    trialEndsAt: Date | null;
    hasUsedTrial: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus>('none');
    const [loading, setLoading] = useState(true);
    const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
    const [hasUsedTrial, setHasUsedTrial] = useState(false);

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
                    const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
                    const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;

                    setTrialEndsAt(trialEnd);
                    setHasUsedTrial(data.has_used_trial || false);

                    const now = new Date();

                    // Check if trial is expired
                    if (data.status === 'trialing' && trialEnd && trialEnd < now) {
                        setStatus('expired');
                    }
                    // Check if active subscription has ended (and not renewed/grace period logic handled by backend usually, but client-side safety)
                    else if (data.status === 'active' && periodEnd && periodEnd < now) {
                        setStatus('expired');
                    }
                    else {
                        setStatus(data.status as SubscriptionStatus);
                    }
                } else {
                    setStatus('none');
                    setHasUsedTrial(false);
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
                setStatus('none');
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();

        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Subscription update received:', payload);
                    fetchSubscription();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const isPremium = profile?.is_admin || status === 'active' || status === 'trialing';

    const value = {
        status,
        loading,
        isPremium,
        trialEndsAt,
        hasUsedTrial
    };

    return (
        <SubscriptionContext.Provider value= { value } >
        { children }
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
