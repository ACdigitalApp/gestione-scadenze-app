import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, ArrowLeft, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: 'Transazioni', free: '10/mese', pro: 'Illimitate', freeAllowed: true, proAllowed: true },
  { name: 'Promemoria scadenze', free: true, pro: true, freeAllowed: true, proAllowed: true },
  { name: 'Allegati documenti', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Export PDF/Excel', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Report avanzati', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Sintesi vocale TTS', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Notifiche WhatsApp', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Backup automatici', free: false, pro: true, freeAllowed: false, proAllowed: true },
  { name: 'Supporto prioritario', free: false, pro: true, freeAllowed: false, proAllowed: true },
];

export default function Pricing() {
  const { user } = useAuth();
  const { upgradeToPro, loading, isInTrial, trialDaysRemaining } = useSubscription();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setIsPro(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();
      setIsPro(data?.subscription_status === 'active');
    };
    checkSubscription();
  }, [user]);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
              Scegli il tuo piano
            </h1>
            <p className="text-muted-foreground text-lg mb-4">
              Sblocca tutto il potenziale di Gestione Scadenze
            </p>
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
              <Star className="w-4 h-4" />
              14 giorni di prova gratuita, nessuna carta di credito
            </div>
          </div>
        </motion.div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center bg-muted rounded-full p-1 gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mensile
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annuale
              <Badge className="bg-green-500 text-white text-xs border-0 px-1.5 py-0">-33%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-2">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">
                  {isInTrial ? 'Trial Pro' : 'Free'}
                </CardTitle>
                <CardDescription>
                  {isInTrial
                    ? `${trialDaysRemaining} giorni rimasti`
                    : 'Per iniziare'
                  }
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">€0</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isInTrial
                    ? 'Accesso completo durante il trial'
                    : 'Max 10 transazioni/mese dopo il trial'
                  }
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {features.map((feature) => {
                    const allowed = isInTrial || feature.freeAllowed;
                    const displayValue = typeof feature.free === 'string'
                      ? feature.free
                      : feature.name;
                    return (
                      <li key={feature.name} className="flex items-center gap-3">
                        {allowed ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <span className={!allowed ? 'text-muted-foreground/60' : ''}>
                          {feature.name}
                          {typeof feature.free === 'string' && !isInTrial && (
                            <span className="text-muted-foreground text-xs ml-1">({feature.free})</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {isInTrial && (
                  <Badge className="w-full justify-center py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                    Trial attivo - {trialDaysRemaining} giorni rimasti
                  </Badge>
                )}

                {!isPro && isPro !== null && !isInTrial && (
                  <Button variant="outline" className="w-full" disabled>
                    Piano attuale
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-2 border-yellow-500 relative overflow-hidden shadow-xl shadow-yellow-500/20">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />

              {billingCycle === 'monthly' ? (
                <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Crown className="w-3 h-3 mr-1" />
                  Più Popolare
                </Badge>
              ) : (
                <Badge className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                  <Zap className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              )}

              <CardHeader className="text-center pb-2 pt-12">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  {billingCycle === 'monthly' ? 'Pro Mensile' : 'Pro Annuale'}
                </CardTitle>
                <CardDescription>Accesso completo</CardDescription>
                <div className="pt-4">
                  {billingCycle === 'monthly' ? (
                    <>
                      <span className="text-4xl font-bold">€4,99</span>
                      <span className="text-muted-foreground">/mese</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">€39,99</span>
                      <span className="text-muted-foreground">/anno</span>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">€3,33/mese</span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
                          Risparmia 33%
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>
                        {feature.name}
                        {typeof feature.pro === 'string' && (
                          <span className="text-muted-foreground text-xs ml-1">({feature.pro})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {isPro ? (
                  <Button className="w-full" disabled>
                    <Crown className="w-4 h-4 mr-2" />
                    Piano attuale
                  </Button>
                ) : user ? (
                  <Button
                    onClick={() => upgradeToPro(billingCycle)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg text-lg py-6"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    {loading
                      ? 'Caricamento...'
                      : billingCycle === 'monthly'
                      ? 'Abbonati a €4,99/mese'
                      : 'Abbonati a €39,99/anno'
                    }
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg py-6"
                  >
                    Registrati per iniziare
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  14 giorni gratuiti · Annulla in qualsiasi momento
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feature comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-12 max-w-3xl mx-auto"
        >
          <h2 className="text-xl font-semibold mb-4 text-center">Confronto funzionalità</h2>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Funzionalità</th>
                  <th className="text-center p-3 font-semibold">Free</th>
                  <th className="text-center p-3 font-semibold text-yellow-600">
                    <span className="flex items-center justify-center gap-1">
                      <Crown className="w-4 h-4" /> Pro
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Transazioni', free: '10/mese', pro: 'Illimitate' },
                  { name: 'Promemoria scadenze', free: '✓', pro: '✓' },
                  { name: 'Allegati documenti', free: '✗', pro: '✓' },
                  { name: 'Export PDF/Excel', free: '✗', pro: '✓' },
                  { name: 'Report avanzati', free: '✗', pro: '✓' },
                  { name: 'Sintesi vocale TTS', free: '✗', pro: '✓' },
                  { name: 'Notifiche WhatsApp', free: '✗', pro: '✓' },
                  { name: 'Backup automatici', free: '✗', pro: '✓' },
                  { name: 'Supporto prioritario', free: '✗', pro: '✓' },
                ].map((row, idx) => (
                  <tr key={row.name} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                    <td className="p-3">{row.name}</td>
                    <td className={`p-3 text-center font-medium ${row.free === '✗' ? 'text-muted-foreground/40' : row.free === '✓' ? 'text-green-600' : ''}`}>
                      {row.free}
                    </td>
                    <td className={`p-3 text-center font-medium ${row.pro === '✓' ? 'text-green-600' : 'text-foreground'}`}>
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold mb-4">Domande frequenti</h2>
          <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Come funziona il periodo di prova?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quando ti registri, hai 14 giorni di accesso completo a tutte le funzionalità Pro gratuitamente. Nessuna carta di credito richiesta.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posso annullare in qualsiasi momento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sì, puoi annullare la tua sottoscrizione in qualsiasi momento. L'accesso Pro rimarrà attivo fino alla fine del periodo di fatturazione.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cosa succede dopo il trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dopo 14 giorni, passi al piano Free con massimo 10 transazioni/mese. Le funzionalità Pro (allegati, export, TTS, ecc.) vengono disattivate finché non ti abboni.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Qual è la differenza tra mensile e annuale?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Il piano annuale a €39,99/anno equivale a €3,33/mese, risparmio del 37% rispetto al mensile (€4,99/mese). Stesse funzionalità, massimo risparmio.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Come funziona il pagamento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Utilizziamo Stripe per gestire i pagamenti in modo sicuro. Accettiamo carte di credito e debito.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posso passare da mensile ad annuale?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sì, puoi cambiare piano in qualsiasi momento dal portale di gestione abbonamento. Il cambio avviene alla prossima scadenza.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
