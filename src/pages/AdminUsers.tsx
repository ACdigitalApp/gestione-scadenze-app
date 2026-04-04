import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, ShieldCheck, Phone, Save, Loader2, RefreshCw,
  Search, Trash2, TrendingUp, Bell, BellOff, UserPlus,
  Crown, Ban, CheckCircle2, CreditCard, Calendar, Euro,
  AlertTriangle, UserCheck,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  notification_enabled: boolean | null;
  whatsapp_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  role: 'admin' | 'user';
  // Subscription fields
  subscription_plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  trial_end_date: string | null;
  // Computed financials (from transactions)
  total_paid: number;
  balance: number;
}

interface EditForm {
  whatsapp_number: string;
  notification_enabled: boolean;
  role: 'admin' | 'user';
  subscription_plan: string;
  subscription_status: string;
  trial_end_date: string;
}

interface NewUserForm {
  full_name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  subscription_plan: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  premium: 'Premium',
  pro: 'Pro',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo',
  trialing: 'Trial',
  cancelled: 'Cancellato',
  blocked: 'Bloccato',
  expired: 'Scaduto',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  trialing: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-orange-50 text-orange-700 border-orange-200',
};

// ── Helper functions ──────────────────────────────────────────────────────────

function getRoleBadge(role: 'admin' | 'user', plan: string | null) {
  if (role === 'admin') {
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1">
        <Shield className="w-3 h-3" /> Admin
      </Badge>
    );
  }
  if (plan === 'premium' || plan === 'pro') {
    return (
      <Badge className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs gap-1 font-semibold">
        <Crown className="w-3 h-3" /> User Pro
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">User</Badge>
  );
}

function getPlanBadge(plan: string | null) {
  const p = plan || 'free';
  const label = PLAN_LABELS[p] || p;
  if (p === 'premium' || p === 'pro') {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs gap-1">
        <Crown className="w-3 h-3" />{label}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs text-muted-foreground">{label}</Badge>;
}

function getStatusBadge(status: string | null) {
  const s = status || 'active';
  const label = STATUS_LABELS[s] || s;
  const color = STATUS_COLORS[s] || STATUS_COLORS.active;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${color}`}>
      {label}
    </Badge>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yy HH:mm', { locale: it });
  } catch {
    return dateStr.split('T')[0];
  }
}

function formatCurrency(val: number) {
  if (!val) return '—';
  return `€${val.toFixed(2)}`;
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card className="border border-border/60">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className={`p-2 rounded-lg bg-primary/5 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    whatsapp_number: '',
    notification_enabled: false,
    role: 'user',
    subscription_plan: 'free',
    subscription_status: 'active',
    trial_end_date: '',
  });
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Nuovo Utente dialog
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    subscription_plan: 'free',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Accesso negato: richiesto ruolo admin');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  // ── Fetch users ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: rpcData, error } = await supabase.rpc('get_all_users_for_admin');
      if (error) { toast.error('Errore nel caricamento utenti'); return; }
      if (!rpcData || rpcData.length === 0) { setUsers([]); return; }

      const ids = (rpcData as { id: string }[]).map(u => u.id);

      // Fetch extended profile data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, subscription_plan, subscription_status, stripe_customer_id, trial_end_date')
        .in('id', ids);

      const profilesMap: Record<string, {
        subscription_plan: string | null;
        subscription_status: string | null;
        stripe_customer_id: string | null;
        trial_end_date: string | null;
      }> = {};
      (profilesData || []).forEach((p: {
        id: string;
        subscription_plan: string | null;
        subscription_status: string | null;
        stripe_customer_id: string | null;
        trial_end_date: string | null;
      }) => { profilesMap[p.id] = p; });

      const merged: UserProfile[] = (rpcData as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        notification_enabled: boolean | null;
        whatsapp_number: string | null;
        created_at: string | null;
        updated_at: string | null;
        role: 'admin' | 'user';
        email?: string | null;
      }[]).map(u => ({
        ...u,
        email: u.email ?? null,
        subscription_plan: profilesMap[u.id]?.subscription_plan ?? 'free',
        subscription_status: profilesMap[u.id]?.subscription_status ?? 'active',
        stripe_customer_id: profilesMap[u.id]?.stripe_customer_id ?? null,
        trial_end_date: profilesMap[u.id]?.trial_end_date ?? null,
        total_paid: 0,
        balance: 0,
      }));

      setUsers(merged);
    } catch (err) {
      toast.error('Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = {
    incassoTotale: users.reduce((s, u) => s + u.total_paid, 0),
    saldoTotale: users.reduce((s, u) => s + u.balance, 0),
    utentiPaganti: users.filter(u => u.subscription_plan === 'premium' || u.subscription_plan === 'pro').length,
    ultimi30gg: 0, // requires payment query
    trialAttive: users.filter(u => u.subscription_status === 'trialing').length,
    scaduti: users.filter(u => u.subscription_status === 'expired' || u.subscription_status === 'cancelled').length,
  };

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.whatsapp_number || '').toLowerCase().includes(q);
    const matchPlan = filterPlan === 'all' || (u.subscription_plan || 'free') === filterPlan;
    const matchStatus =
      filterStatus === 'all' ||
      (u.subscription_status || 'active') === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  // ── Edit helpers ─────────────────────────────────────────────────────────────

  const startEditing = (u: UserProfile) => {
    setEditingUser(u.id);
    setEditForm({
      whatsapp_number: u.whatsapp_number || '',
      notification_enabled: u.notification_enabled || false,
      role: u.role || 'user',
      subscription_plan: u.subscription_plan || 'free',
      subscription_status: u.subscription_status || 'active',
      trial_end_date: u.trial_end_date ? u.trial_end_date.split('T')[0] : '',
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
  };

  const saveUser = async (userId: string) => {
    try {
      setSaving(userId);

      const { error: profileError } = await supabase.rpc('admin_update_profile', {
        _target_user_id: userId,
        _whatsapp_number: editForm.whatsapp_number || null,
        _notification_enabled: editForm.notification_enabled,
      });
      if (profileError) { toast.error('Errore aggiornamento profilo'); return; }

      const { error: roleError } = await supabase.rpc('update_user_role', {
        _target_user_id: userId,
        _new_role: editForm.role,
      });
      if (roleError) { toast.error('Errore aggiornamento ruolo'); return; }

      const { error: subError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: editForm.subscription_plan,
          subscription_status: editForm.subscription_status,
          trial_end_date: editForm.trial_end_date || null,
        })
        .eq('id', userId);
      if (subError) { toast.error('Errore aggiornamento abbonamento'); return; }

      toast.success('Utente aggiornato con successo');
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error('Errore salvataggio');
    } finally {
      setSaving(null);
    }
  };

  // ── Block/Unblock ────────────────────────────────────────────────────────────

  const toggleBlock = async (u: UserProfile) => {
    try {
      setBlocking(u.id);
      const newStatus = u.subscription_status === 'blocked' ? 'active' : 'blocked';
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: newStatus })
        .eq('id', u.id);
      if (error) { toast.error('Errore aggiornamento stato'); return; }
      toast.success(newStatus === 'blocked' ? 'Utente bloccato' : 'Utente sbloccato');
      fetchUsers();
    } catch {
      toast.error('Errore');
    } finally {
      setBlocking(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const deleteUser = async (userId: string) => {
    try {
      setDeleting(userId);
      const { error } = await supabase.rpc('admin_delete_user', { _target_user_id: userId });
      if (error) { toast.error('Errore eliminazione utente'); return; }
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Utente eliminato');
    } catch {
      toast.error('Errore eliminazione');
    } finally {
      setDeleting(null);
    }
  };

  // ── Create new user ──────────────────────────────────────────────────────────

  const createUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast.error('Email e password sono obbligatori');
      return;
    }
    try {
      setCreatingUser(true);
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserForm.email,
        password: newUserForm.password,
        email_confirm: true,
        user_metadata: { full_name: newUserForm.full_name },
      });
      if (error) { toast.error('Errore creazione utente: ' + error.message); return; }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: newUserForm.full_name || null,
          subscription_plan: newUserForm.subscription_plan,
        });
        if (newUserForm.role === 'admin') {
          await supabase.rpc('update_user_role', {
            _target_user_id: data.user.id,
            _new_role: 'admin',
          });
        }
      }
      toast.success('Utente creato con successo');
      setShowNewUser(false);
      setNewUserForm({ full_name: '', email: '', password: '', role: 'user', subscription_plan: 'free' });
      fetchUsers();
    } catch {
      toast.error('Errore creazione utente');
    } finally {
      setCreatingUser(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (adminLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Gestione Utenti</h1>
              <p className="text-xs text-muted-foreground">Amministra utenti, piani e incassi</p>
            </div>
          </motion.div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
              <RefreshCw className="w-4 h-4" /> Aggiorna
            </Button>
            <Button size="sm" onClick={() => setShowNewUser(true)} className="gap-2 bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4" /> Nuovo Utente
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <StatCard icon={Euro} label="Incasso Totale" value={`€${stats.incassoTotale.toFixed(2)}`} color="text-green-600" />
          <StatCard icon={TrendingUp} label="Saldo Totale" value={`€${stats.saldoTotale.toFixed(2)}`} color="text-blue-600" />
          <StatCard icon={UserCheck} label="Utenti Paganti" value={stats.utentiPaganti} color="text-yellow-600" />
          <StatCard icon={Euro} label="Ultimi 30gg" value={`€${stats.ultimi30gg.toFixed(2)}`} color="text-purple-600" />
          <StatCard icon={Calendar} label="Trial Attive" value={stats.trialAttive} color="text-cyan-600" />
          <StatCard icon={AlertTriangle} label="Scaduti" value={stats.scaduti} color="text-red-500" />
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca nome o email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Tutti i piani" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i piani</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancellato</SelectItem>
                  <SelectItem value="blocked">Bloccato</SelectItem>
                  <SelectItem value="expired">Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="whitespace-nowrap">Nome</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Ruolo</TableHead>
                    <TableHead className="whitespace-nowrap">Piano</TableHead>
                    <TableHead className="whitespace-nowrap">Provider</TableHead>
                    <TableHead className="whitespace-nowrap">Stato Abb.</TableHead>
                    <TableHead className="whitespace-nowrap">Scadenza</TableHead>
                    <TableHead className="whitespace-nowrap">Tot. Pagato</TableHead>
                    <TableHead className="whitespace-nowrap">Saldo</TableHead>
                    <TableHead className="whitespace-nowrap">WhatsApp</TableHead>
                    <TableHead className="whitespace-nowrap">Notifiche</TableHead>
                    <TableHead className="whitespace-nowrap">Data Reg.</TableHead>
                    <TableHead className="whitespace-nowrap">Ultimo Accesso</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Utenti Registrati header */}
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={14} className="py-1 px-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        Utenti Registrati ({filtered.length}{search ? ` di ${users.length}` : ''})
                      </div>
                    </TableCell>
                  </TableRow>

                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-10 text-muted-foreground text-sm">
                        Nessun utente trovato
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(userProfile => {
                      const isEditing = editingUser === userProfile.id;
                      const isMe = userProfile.id === user?.id;

                      return (
                        <TableRow key={userProfile.id} className={isEditing ? 'bg-primary/5' : ''}>

                          {/* Nome */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0
                                ${userProfile.role === 'admin'
                                  ? 'bg-gradient-to-br from-green-500 to-green-700'
                                  : 'bg-gradient-to-br from-primary to-green-800'}`}
                              >
                                {(userProfile.full_name || userProfile.email || 'U')[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">
                                {userProfile.full_name || '—'}
                                {isMe && <Badge variant="outline" className="ml-1 text-[10px] py-0">Tu</Badge>}
                              </span>
                            </div>
                          </TableCell>

                          {/* Email */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {userProfile.email || '—'}
                          </TableCell>

                          {/* Ruolo */}
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editForm.role}
                                onValueChange={(v: 'admin' | 'user') => setEditForm({ ...editForm, role: v })}
                              >
                                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getRoleBadge(userProfile.role, userProfile.subscription_plan)
                            )}
                          </TableCell>

                          {/* Piano */}
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editForm.subscription_plan}
                                onValueChange={v => setEditForm({ ...editForm, subscription_plan: v })}
                              >
                                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getPlanBadge(userProfile.subscription_plan)
                            )}
                          </TableCell>

                          {/* Provider */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {userProfile.stripe_customer_id
                              ? <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />Stripe</span>
                              : '—'}
                          </TableCell>

                          {/* Stato Abb. */}
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editForm.subscription_status}
                                onValueChange={v => setEditForm({ ...editForm, subscription_status: v })}
                              >
                                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Attivo</SelectItem>
                                  <SelectItem value="trialing">Trial</SelectItem>
                                  <SelectItem value="cancelled">Cancellato</SelectItem>
                                  <SelectItem value="blocked">Bloccato</SelectItem>
                                  <SelectItem value="expired">Scaduto</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getStatusBadge(userProfile.subscription_status)
                            )}
                          </TableCell>

                          {/* Scadenza */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={editForm.trial_end_date}
                                onChange={e => setEditForm({ ...editForm, trial_end_date: e.target.value })}
                                className="w-32 h-7 text-xs"
                              />
                            ) : (
                              userProfile.trial_end_date
                                ? formatDate(userProfile.trial_end_date)
                                : '—'
                            )}
                          </TableCell>

                          {/* Tot. Pagato */}
                          <TableCell className="text-xs text-muted-foreground">
                            {formatCurrency(userProfile.total_paid)}
                          </TableCell>

                          {/* Saldo */}
                          <TableCell className="text-xs text-muted-foreground">
                            {formatCurrency(userProfile.balance)}
                          </TableCell>

                          {/* WhatsApp */}
                          <TableCell className="whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                value={editForm.whatsapp_number}
                                onChange={e => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                                placeholder="+39..."
                                className="w-32 h-7 text-xs"
                              />
                            ) : (
                              <span className="text-xs flex items-center gap-1">
                                {userProfile.whatsapp_number
                                  ? <><Phone className="w-3 h-3 text-green-600" />{userProfile.whatsapp_number}</>
                                  : <span className="text-muted-foreground">—</span>}
                              </span>
                            )}
                          </TableCell>

                          {/* Notifiche */}
                          <TableCell>
                            {isEditing ? (
                              <Switch
                                checked={editForm.notification_enabled}
                                onCheckedChange={c => setEditForm({ ...editForm, notification_enabled: c })}
                              />
                            ) : (
                              <Switch checked={!!userProfile.notification_enabled} disabled />
                            )}
                          </TableCell>

                          {/* Data Reg. */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(userProfile.created_at)}
                          </TableCell>

                          {/* Ultimo Accesso */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(userProfile.updated_at)}
                          </TableCell>

                          {/* Azioni */}
                          <TableCell className="text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 text-xs">Annulla</Button>
                                <Button
                                  size="sm"
                                  onClick={() => saveUser(userProfile.id)}
                                  disabled={saving === userProfile.id}
                                  className="h-7 text-xs gap-1"
                                >
                                  {saving === userProfile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  Salva
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => startEditing(userProfile)} className="h-7 text-xs">
                                  Modifica
                                </Button>
                                {!isMe && (
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => toggleBlock(userProfile)}
                                    disabled={blocking === userProfile.id}
                                    title={userProfile.subscription_status === 'blocked' ? 'Sblocca' : 'Blocca'}
                                    className={`h-7 w-7 p-0 ${userProfile.subscription_status === 'blocked'
                                      ? 'text-green-600 hover:bg-green-50'
                                      : 'text-orange-500 hover:bg-orange-50'}`}
                                  >
                                    {blocking === userProfile.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : userProfile.subscription_status === 'blocked'
                                        ? <CheckCircle2 className="w-3 h-3" />
                                        : <Ban className="w-3 h-3" />}
                                  </Button>
                                )}
                                {!isMe && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" disabled={deleting === userProfile.id}
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                        {deleting === userProfile.id
                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                          : <Trash2 className="w-3 h-3" />}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Eliminare utente?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Stai per eliminare <strong>{userProfile.full_name || userProfile.email || 'questo utente'}</strong>.
                                          Tutte le sue scadenze verranno eliminate. Azione irreversibile.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteUser(userProfile.id)} className="bg-red-600 hover:bg-red-700">
                                          Elimina
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Nuovo Utente Dialog */}
        <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Nuovo Utente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm">Nome completo</Label>
                <Input
                  placeholder="Mario Rossi"
                  value={newUserForm.full_name}
                  onChange={e => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Email *</Label>
                <Input
                  type="email"
                  placeholder="mario@example.com"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Password *</Label>
                <Input
                  type="password"
                  placeholder="Min. 8 caratteri"
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Ruolo</Label>
                  <Select value={newUserForm.role} onValueChange={(v: 'admin' | 'user') => setNewUserForm({ ...newUserForm, role: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Piano</Label>
                  <Select value={newUserForm.subscription_plan} onValueChange={v => setNewUserForm({ ...newUserForm, subscription_plan: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewUser(false)}>Annulla</Button>
              <Button onClick={createUser} disabled={creatingUser} className="gap-2">
                {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Crea Utente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
