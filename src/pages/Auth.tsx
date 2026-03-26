import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useAuth, supabase } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import euro100 from '@/assets/2-euro-coin.png';

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri')
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri')
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email richiesta',
        description: 'Inserisci la tua email per recuperare la password.',
        variant: 'destructive'
      });
      return;
    }

    const emailValidation = z.string().email().safeParse(email);
    if (!emailValidation.success) {
      toast({
        title: 'Email non valida',
        description: 'Inserisci un indirizzo email valido.',
        variant: 'destructive'
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: 'Errore',
          description: 'Si è verificato un errore. Riprova più tardi.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Email inviata!',
          description: 'Controlla la tua casella email per recuperare la password.',
        });
        setIsResettingPassword(false);
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const schema = isLogin ? loginSchema : signupSchema;
      const data = isLogin ? { email, password } : { email, password, fullName };
      
      const validation = schema.safeParse(data);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Auth error:', error);
          if (error.message.includes('Invalid login') || error.message.includes('invalid_credentials')) {
            toast({
              title: 'Credenziali non valide',
              description: 'Email o password errati. Riprova.',
              variant: 'destructive'
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'Email non confermata',
              description: 'Verifica la tua email prima di accedere.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Errore di accesso',
              description: 'Si è verificato un errore. Riprova più tardi.',
              variant: 'destructive'
            });
          }
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          console.error('Signup error:', error);
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            toast({
              title: 'Email già registrata',
              description: 'Questa email è già associata a un account. Prova ad accedere.',
              variant: 'destructive'
            });
          } else if (error.message.includes('weak_password')) {
            toast({
              title: 'Password debole',
              description: 'La password deve essere più sicura.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Errore di registrazione',
              description: 'Si è verificato un errore. Riprova più tardi.',
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Account creato!',
            description: 'Benvenuto in Gestione Scadenze.'
          });
        }
      }
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Back to landing button */}
      <Link to="/landing" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </Button>
      </Link>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 shadow-card">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
            >
              <img src={euro100} alt="100 Euro" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isLogin ? 'Bentornato!' : 'Crea Account'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'Accedi per gestire le tue scadenze' : 'Inizia a gestire le tue finanze'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Label htmlFor="fullName" className="text-foreground">Nome completo</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Mario Rossi"
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                )}
              </motion.div>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario@esempio.it"
                  className="pl-10"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm mt-1">{errors.password}</p>
              )}
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setIsResettingPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors mt-2"
                >
                  Non ricordi la password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Accedi' : 'Registrati'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Password Reset Modal */}
          {isResettingPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && setIsResettingPassword(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl"
              >
                <h2 className="text-xl font-bold text-foreground mb-2">Recupera Password</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Inserisci la tua email e ti invieremo un link per reimpostare la password.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="reset-email"
                          name="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mario@esempio.it"
                        className="pl-10"
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsResettingPassword(false)}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="flex-1 gradient-primary"
                    >
                      {resetLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Invia link'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>Non hai un account? <span className="text-primary font-medium">Registrati</span></>
              ) : (
                <>Hai già un account? <span className="text-primary font-medium">Accedi</span></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
