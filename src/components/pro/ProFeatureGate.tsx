import { Crown, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface ProFeatureGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function ProFeatureGate({ open, onOpenChange, feature }: ProFeatureGateProps) {
  const { upgradeToPro, loading, isInTrial, trialDaysRemaining } = useSubscription();
  const navigate = useNavigate();

  // If in trial, user has access - this shouldn't show
  if (isInTrial) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 w-fit">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            Il tuo trial è terminato
            <Clock className="w-5 h-5 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            <strong>{feature}</strong> è una funzionalità esclusiva del piano Pro.
            <br />
            Abbonati per continuare ad usare tutte le funzionalità premium!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">€3,99<span className="text-base font-normal text-muted-foreground">/mese</span></p>
            <p className="text-sm text-muted-foreground mt-1">oppure €29,99/anno (€2,50/mese, risparmio 37%)</p>
          </div>
          
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              Allegati e documenti illimitati
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              Export PDF, Excel e stampa
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              Sintesi vocale TTS avanzata
            </li>
            <li className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              Notifiche WhatsApp
            </li>
          </ul>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => upgradeToPro()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              {loading ? 'Caricamento...' : 'Abbonati a €3,99/mese'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="w-full"
            >
              Scopri tutti i vantaggi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
