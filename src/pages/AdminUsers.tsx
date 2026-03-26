import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, ShieldCheck, Mail, Phone, Save, Loader2, RefreshCw,
  Search, Trash2, Euro, TrendingUp, Bell, BellOff, UserCheck, UserX,
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

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  notification_enabled: boolean | null;
  whatsapp_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  role: 'admin' | 'user';
}

interface CrossAppData {
  amount: number;
  users: number;
  loading: boolean;
}

const CROSS_APP_APIS: Record<string, string> = {
  gestionepassword: 'https://gestione-password-backend.up.railway.app/api/admin/revenue',
  speaklivetranslate: 'https://speaklivetranslate-backend.up.railway.app/api/admin/revenue',
  librifree: 'https://librifree-backend.up.railway.app/api/admin/revenue',
};

const APP_LABELS: Record<string, string> = {
  gestionepassword: 'Gestione Password',
  speaklivetranslate: 'SpeakEasy Translator',
  librifree: 'Libri Free',
};

const APP_COLORS: Record<string, string> = {
  gestionepassword: 'bg-green-100 text-green-800 border-green-200',
  speaklivetranslate: 'bg-blue-100 text-blue-800 border-blue-200',
  librifree: 'bg-amber-100 text-amber-800 border-amber-200',
};

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border border-border/60">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppRevenueCard({
  appKey,
  data,
}: {
  appKey: string;
  data: CrossAppData;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${APP_COLORS[appKey]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {APP_LABELS[appKey]}
      </p>
      {data.loading ? (
        <div className="flex items-center gap-2 mt-1">
          <Loader2 className="w-4 h-4 animate-spin opacity-60" />
          <span className="text-sm opacity-60">Caricamento...</span>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold">€ {data.amount.toFixed(2)}</p>
          <p className="text-xs opacity-70">{data.users} utenti paganti</p>
        </>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    whatsapp_number: string;
    notification_enabled: boolean;
    role: 'admin' | 'user';
  }>({ whatsapp_number: '', notification_enabled: false, role: 'user' });
  const [search, setSearch] = useState('');
  const [crossApp, setCrossApp] = useState<Record<string, CrossAppData>>({
    gestionepassword: { amount: 0, users: 0, loading: true },
    speaklivetranslate: { amount: 0, users: 0, loading: true },
    librifree: { amount: 0, users: 0, loading: true },
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Accesso negato: richiesto ruolo admin');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  // ── Fetch users ───────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users_for_admin');
      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Errore nel caricamento utenti');
        return;
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  // ── Cross-app revenue ─────────────────────────────────────────────────────

  const fetchCrossAppRevenue = useCallback(async () => {
    setCrossApp({
      gestionepassword: { amount: 0, users: 0, loading: true },
      speaklivetranslate: { amount: 0, users: 0, loading: true },
      librifree: { amount: 0, users: 0, loading: true },
    });
    const apps = Object.keys(CROSS_APP_APIS);
    for (const app of apps) {
      try {
        const res = await fetch(CROSS_APP_APIS[app], {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          setCrossApp(prev => ({
            ...prev,
            [app]: { amount: data.total_revenue ?? 0, users: data.paying_users ?? 0, loading: false },
          }));
        } else {
          setCrossApp(prev => ({ ...prev, [app]: { amount: 0, users: 0, loading: false } }));
        }
      } catch {
        setCrossApp(prev => ({ ...prev, [app]: { amount: 0, users: 0, loading: false } }));
      }
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCrossAppRevenue();
    }
  }, [isAdmin, fetchCrossAppRevenue]);

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const startEditing = (u: UserProfile) => {
    setEditingUser(u.id);
    setEditForm({
      whatsapp_number: u.whatsapp_number || '',
      notification_enabled: u.notification_enabled || false,
      role: u.role || 'user',
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ whatsapp_number: '', notification_enabled: false, role: 'user' });
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

      toast.success('Utente aggiornato');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Errore salvataggio');
    } finally {
      setSaving(null);
    }
  };

  // ── Delete helper ─────────────────────────────────────────────────────────

  const deleteUser = async (userId: string) => {
    try {
      setDeleting(userId);
      const { error } = await supabase.rpc('admin_delete_user', {
        _target_user_id: userId,
      });
      if (error) {
        toast.error('Errore nell\'eliminazione utente');
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Utente eliminato');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Errore eliminazione');
    } finally {
      setDeleting(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.whatsapp_number || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    notificationsOn: users.filter(u => u.notification_enabled).length,
    withWhatsapp: users.filter(u => u.whatsapp_number).length,
  };

  const crossAppTotal = Object.values(crossApp).reduce(
    (sum, d) => sum + (d.loading ? 0 : d.amount),
    0,
  );

  // ── Loading state ─────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <ShieldCheck className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              Gestione Utenti
            </h1>
          </motion.div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchUsers(); fetchCrossAppRevenue(); }}
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
            >
              <RefreshCw className="w-4 h-4" />
              Aggiorna
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Utenti Totali" value={stats.total} />
          <StatCard icon={Shield} label="Admin" value={stats.admins} color="text-amber-600" />
          <StatCard icon={Bell} label="Notifiche Attive" value={stats.notificationsOn} color="text-blue-600" />
          <StatCard icon={Phone} label="Con WhatsApp" value={stats.withWhatsapp} color="text-green-600" />
        </div>

        {/* ── Cross-App Revenue Dashboard ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-primary" />
              Incassi Tutte le App
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Totale generale:&nbsp;
                <span className="font-bold text-primary">
                  € {crossAppTotal.toFixed(2)}
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.keys(CROSS_APP_APIS).map(app => (
                <AppRevenueCard key={app} appKey={app} data={crossApp[app]} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Users Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Utenti Registrati ({filtered.length}{search ? ` di ${users.length}` : ''})
              </CardTitle>
              <div className="relative sm:ml-auto w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, ruolo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Notifiche</TableHead>
                    <TableHead>Data Reg.</TableHead>
                    <TableHead>Ultimo Aggiorn.</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nessun utente trovato
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(userProfile => (
                      <TableRow key={userProfile.id}>

                        {/* Nome */}
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0
                              ${userProfile.role === 'admin'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                                : 'bg-gradient-to-br from-primary to-green-800'}`}
                            >
                              {(userProfile.full_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold">
                                {userProfile.full_name || 'Senza nome'}
                                {userProfile.id === user?.id && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">Tu</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Ruolo */}
                        <TableCell>
                          {editingUser === userProfile.id ? (
                            <Select
                              value={editForm.role}
                              onValueChange={(value: 'admin' | 'user') =>
                                setEditForm({ ...editForm, role: value })
                              }
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={userProfile.role === 'admin' ? 'default' : 'secondary'}
                              className={userProfile.role === 'admin' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                            >
                              {userProfile.role === 'admin' ? (
                                <><Shield className="w-3 h-3 mr-1" />Admin</>
                              ) : (
                                'User'
                              )}
                            </Badge>
                          )}
                        </TableCell>

                        {/* WhatsApp */}
                        <TableCell>
                          {editingUser === userProfile.id ? (
                            <Input
                              value={editForm.whatsapp_number}
                              onChange={e => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                              placeholder="+39..."
                              className="w-32 h-7 text-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-green-600 shrink-0" />
                              {userProfile.whatsapp_number || <span className="text-muted-foreground">—</span>}
                            </div>
                          )}
                        </TableCell>

                        {/* Notifiche */}
                        <TableCell>
                          {editingUser === userProfile.id ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editForm.notification_enabled}
                                onCheckedChange={checked =>
                                  setEditForm({ ...editForm, notification_enabled: checked })
                                }
                              />
                              <Label className="text-xs">
                                {editForm.notification_enabled ? 'On' : 'Off'}
                              </Label>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              {userProfile.notification_enabled
                                ? <Bell className="w-4 h-4 text-blue-500" />
                                : <BellOff className="w-4 h-4 text-muted-foreground" />}
                              <span className={`text-xs ${userProfile.notification_enabled ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                {userProfile.notification_enabled ? 'Attive' : 'Disattive'}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Data Registrazione */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {userProfile.created_at
                            ? format(new Date(userProfile.created_at), 'dd MMM yyyy', { locale: it })
                            : '—'}
                        </TableCell>

                        {/* Ultimo Aggiornamento */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {userProfile.updated_at
                            ? format(new Date(userProfile.updated_at), 'dd MMM yyyy', { locale: it })
                            : '—'}
                        </TableCell>

                        {/* Azioni */}
                        <TableCell className="text-right">
                          {editingUser === userProfile.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 text-xs">
                                Annulla
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveUser(userProfile.id)}
                                disabled={saving === userProfile.id}
                                className="h-7 text-xs gap-1"
                              >
                                {saving === userProfile.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Save className="w-3 h-3" />}
                                Salva
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(userProfile)}
                                className="h-7 text-xs"
                              >
                                Modifica
                              </Button>
                              {userProfile.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      disabled={deleting === userProfile.id}
                                    >
                                      {deleting === userProfile.id
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Trash2 className="w-3 h-3" />}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eliminare utente?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Stai per eliminare <strong>{userProfile.full_name || 'questo utente'}</strong>.
                                        Tutte le sue scadenze verranno eliminate. Questa azione è irreversibile.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUser(userProfile.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
