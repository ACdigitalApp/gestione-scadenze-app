import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Receipt, Bell, Settings, LogOut, Download, User, ShieldCheck, Mail, Calendar, Clock, CreditCard, Archive, Crown, Landmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import euro100 from '@/assets/2-euro-coin.png';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard', color: '#067d1c' },
  { path: '/transactions', icon: Receipt, label: 'Transazioni', color: '#067d1c' },
  { path: '/plans', icon: CreditCard, label: 'Rate', color: '#067d1c' },
  { path: '/reminders', icon: Bell, label: 'Promemoria', color: '#067d1c' },
  { path: '/archive', icon: Archive, label: 'Archivio', color: '#067d1c' },
  { path: '/settings', icon: Settings, label: 'Impostazioni', color: '#067d1c' },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { avatarUrl, getInitials } = useProfilePhoto();
  const { upgradeToPro, loading: upgradeLoading } = useSubscription();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();
      setIsPro(data?.subscription_status === 'active');
    };
    checkSubscription();
  }, [user]);

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Ospite';
  const isGuest = !user;

  const handleSignOut = async () => {
    await signOut();
    navigate('/landing');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-20 flex-col items-center py-6 glass border-r border-border z-50"
      >
        <motion.div 
          className="w-14 h-14 flex items-center justify-center mb-4 banknote-container"
          animate={{ 
            y: [0, -5, 0],
            rotateY: [0, 10, 0, -10, 0],
            rotateZ: [-1, 1, -1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="banknote-shine w-full h-full rounded">
            <img src={euro100} alt="100 Euro" className="w-full h-full object-contain" />
          </div>
        </motion.div>

        {/* User info */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setUserDialogOpen(true)}
              className="mb-6 cursor-pointer"
            >
              <Avatar className="w-12 h-12 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <AvatarImage src={avatarUrl || undefined} alt="Foto profilo" />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>Informazioni Utente</span>
          </TooltipContent>
        </Tooltip>

        {/* User Info Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <User className="w-5 h-5" />
                Informazioni Utente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                <Avatar className="w-20 h-20 border-2 border-primary/20">
                  <AvatarImage src={avatarUrl || undefined} alt="Foto profilo" />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Separator />

              {/* User Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{displayName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Registrato il</p>
                    <p className="font-medium">{formatDate(user?.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ultimo accesso</p>
                    <p className="font-medium">{formatDate(user?.last_sign_in_at)}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ruolo</p>
                      <p className="font-medium text-primary">Amministratore</p>
                    </div>
                  </div>
                )}

                {isGuest && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Stai usando la modalità demo</p>
                  </div>
                )}

                {/* Subscription Status */}
                {!isGuest && (
                  <div className="flex items-center gap-3">
                    <Crown className={cn("w-4 h-4", isPro ? "text-yellow-500" : "text-muted-foreground")} />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Piano</p>
                      <p className={cn("font-medium", isPro ? "text-yellow-600" : "text-muted-foreground")}>
                        {isPro ? 'Pro' : 'Free'}
                      </p>
                    </div>
                    {!isPro && (
                      <Button 
                        size="sm" 
                        onClick={() => upgradeToPro()}
                        disabled={upgradeLoading}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        Upgrade Pro
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setUserDialogOpen(false);
                    navigate('/settings');
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Impostazioni
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setUserDialogOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'w-12 h-12 rounded-xl transition-all',
                      isActive 
                        ? 'bg-[#067d1c]/20 shadow-glow' 
                        : 'hover:bg-[#067d1c]/10'
                    )}
                    style={{ color: '#067d1c' }}
                  >
                    <item.icon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/install')}
                className={cn(
                  'w-12 h-12 rounded-xl transition-all',
                  location.pathname === '/install'
                    ? 'bg-[#067d1c]/20 shadow-glow' 
                    : 'hover:bg-[#067d1c]/10'
                )}
                style={{ color: '#067d1c' }}
              >
                <Download className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Installa App</TooltipContent>
          </Tooltip>

          {/* Admin link */}
          {isAdmin && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin/users')}
                    className={cn(
                      'w-12 h-12 rounded-xl transition-all',
                      location.pathname === '/admin/users'
                        ? 'bg-[#067d1c]/20 shadow-glow'
                        : 'hover:bg-[#067d1c]/10'
                    )}
                    style={{ color: '#067d1c' }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Gestione Utenti</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin/bancari')}
                    className={cn(
                      'w-12 h-12 rounded-xl transition-all',
                      location.pathname === '/admin/bancari'
                        ? 'bg-[#067d1c]/20 shadow-glow'
                        : 'hover:bg-[#067d1c]/10'
                    )}
                    style={{ color: '#067d1c' }}
                  >
                    <Landmark className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Coordinate Bancarie</TooltipContent>
              </Tooltip>
            </>
          )}
        </nav>

        {/* Logout button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="w-12 h-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isGuest ? 'Esci dalla demo' : 'Esci'}
          </TooltipContent>
        </Tooltip>
      </motion.aside>

      {/* Bottom Navigation - Visible on all screens */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 md:left-20 bg-background/95 backdrop-blur-lg border-t border-border z-50 px-2"
      >
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px]',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn(
                  'p-2 rounded-xl transition-all',
                  isActive && 'bg-primary/10'
                )}>
                  <item.icon 
                    className="w-6 h-6"
                    style={{ color: '#067d1c' }}
                  />
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
