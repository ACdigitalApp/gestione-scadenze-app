import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionStatus {
  isPro: boolean;
  status: string | null;
  plan: string | null;
  trialEndDate: string | null;
  isInTrial: boolean;
  trialDaysRemaining: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isPro: false,
    status: null,
    plan: null,
    trialEndDate: null,
    isInTrial: false,
    trialDaysRemaining: 0,
  });

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setSubscription({ 
          isPro: false, 
          status: null, 
          plan: null,
          trialEndDate: null,
          isInTrial: false,
          trialDaysRemaining: 0,
        });
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, created_at')
        .eq('id', user.id)
        .single();
      
      const hasActiveSubscription = data?.subscription_status === 'active';
      
      // Calculate trial from registration date (created_at) - 14 days
      let isInTrial = false;
      let trialDaysRemaining = 0;
      let trialEndDate: string | null = null;

      if (data?.created_at && !hasActiveSubscription) {
        const registrationDate = new Date(data.created_at);
        const trialEnd = new Date(registrationDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days = 336 hours
        const now = new Date();
        
        trialEndDate = trialEnd.toISOString();
        isInTrial = now <= trialEnd;
        
        if (isInTrial) {
          const diffTime = trialEnd.getTime() - now.getTime();
          trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      
      // User has Pro access if they have active subscription OR are in trial
      const isPro = hasActiveSubscription || isInTrial;
      
      setSubscription({
        isPro,
        status: data?.subscription_status || null,
        plan: data?.subscription_plan || null,
        trialEndDate,
        isInTrial,
        trialDaysRemaining,
      });
    };
    checkSubscription();
  }, [user]);

  const upgradeToPro = async () => {
    if (!user) {
      toast.error('Devi essere autenticato per effettuare l\'upgrade');
      return;
    }

    // Only monthly plan available
    const priceId = 'price_1StOD7EiPZqCo6ZjE6oAiJBM';

    console.log(`Initiating monthly checkout with priceId: ${priceId}`);
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessione non valida. Effettua nuovamente il login.');
        return;
      }

      console.log('Calling stripe-checkout function...');
      const response = await supabase.functions.invoke('stripe-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { priceId },
      });

      console.log('Stripe checkout response:', response);

      if (response.error) {
        console.error('Function error:', response.error);
        const errorDetails = response.error.message || 'Errore durante la creazione del checkout';
        toast.error(`Errore checkout: ${errorDetails}`);
        return;
      }

      if (!response.data) {
        console.error('No data in response');
        toast.error('Risposta non valida dal server');
        return;
      }

      const { url, error: dataError, details } = response.data;
      
      if (dataError) {
        console.error('Response error:', dataError, details);
        toast.error(details || dataError);
        return;
      }

      if (url) {
        console.log('Redirecting to checkout:', url);
        window.location.href = url;
      } else {
        toast.error('URL di checkout non disponibile');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('Upgrade error:', error);
      toast.error(`Errore durante l'upgrade: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessione non valida');
      }

      const response = await supabase.functions.invoke('stripe-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Errore durante l\'apertura del portale');
      }

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL del portale non disponibile');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'apertura del portale';
      console.error('Portal error:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setPortalLoading(false);
    }
  };

  return { 
    upgradeToPro, 
    openCustomerPortal,
    loading, 
    portalLoading,
    subscription,
    isPro: subscription.isPro,
    isInTrial: subscription.isInTrial,
    trialDaysRemaining: subscription.trialDaysRemaining,
  };
}
