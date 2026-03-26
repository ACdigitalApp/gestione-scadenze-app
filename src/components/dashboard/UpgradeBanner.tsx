import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';

export function UpgradeBanner() {
  const { user } = useAuth();
  const { upgradeToPro, loading, isPro, isInTrial, trialDaysRemaining, subscription } = useSubscription();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // ADMIN RULE: Never show banner for admin
  // Don't show if has active subscription, not logged in, or dismissed
  if (!user || dismissed || isAdmin) {
    return null;
  }

  // Show trial info banner during trial
  if (isInTrial) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-700/20 via-green-600/20 to-green-700/20" />
        <div className="relative p-4 md:p-5 border border-green-700/30 rounded-xl backdrop-blur-sm">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-600 to-green-800 shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Trial Pro Attivo
                  <Sparkles className="w-4 h-4 text-green-600" />
                </h3>
                <p className="text-sm text-muted-foreground">
                  {trialDaysRemaining} giorni rimasti - Accesso completo a tutte le funzionalità
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 md:ml-auto">
              <Button
                size="sm"
                onClick={() => upgradeToPro()}
                disabled={loading}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
              >
                <Crown className="w-4 h-4 mr-1" />
                {loading ? 'Caricamento...' : 'Abbonati ora'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show upgrade banner for free users (trial expired, no subscription)
  if (subscription.status !== 'active') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20" />
        <div className="relative p-4 md:p-5 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Il tuo trial è terminato
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </h3>
                <p className="text-sm text-muted-foreground">
                  Abbonati per sbloccare tutte le funzionalità premium
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 md:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/pricing')}
                className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
              >
                Scopri di più
              </Button>
              <Button
                size="sm"
                onClick={() => upgradeToPro()}
                disabled={loading}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
              >
                <Crown className="w-4 h-4 mr-1" />
                {loading ? 'Caricamento...' : 'Abbonati €4,99/mese'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
