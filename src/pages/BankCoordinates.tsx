import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import {
  Landmark, ShieldCheck, Edit2, Save, X,
  CreditCard, ScrollText, History, ArrowLeft, Building2, Copy, Check, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { toast } from 'sonner';

const BANK_KEYS = ['holder', 'bankName', 'iban', 'bic', 'accountNumber', 'notes'] as const;
type BankKey = typeof BANK_KEYS[number];
type BankData = Record<BankKey, string>;

const EMPTY_FORM: BankData = { holder: '', bankName: '', iban: '', bic: '', accountNumber: '', notes: '' };

const DEFAULT_BANK: BankData = {
  holder: 'CARIDI ANTONIO',
  bankName: 'Banco BPM',
  iban: 'IT65F0760116200001010457131',
  bic: 'BPPIITRXXX',
  accountNumber: '',
  notes: '',
};

interface LogEntry {
  id: string;
  date: string;
  action: string;
  user: string;
}

export default function BankCoordinates() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BankData>({ ...DEFAULT_BANK });
  const [form, setForm] = useState<BankData>({ ...DEFAULT_BANK });
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!isAdmin) { navigate('/settings'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('user_id', user.id)
        .in('setting_key', BANK_KEYS.map(k => `bank_${k}`));

      if (rows && rows.length > 0) {
        const d: BankData = { ...DEFAULT_BANK };
        rows.forEach(r => {
          const k = r.setting_key.replace('bank_', '') as BankKey;
          if (BANK_KEYS.includes(k)) d[k] = r.setting_value || '';
        });
        setData(d);
        setForm(d);
      } else {
        setData({ ...DEFAULT_BANK });
        setForm({ ...DEFAULT_BANK });
      }
    } catch {
      toast.error('Errore nel caricamento dati bancari');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.holder.trim() || !form.iban.trim()) {
      toast.error('Intestatario e IBAN sono obbligatori');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      for (const key of BANK_KEYS) {
        await supabase.from('admin_settings').upsert(
          { user_id: user.id, setting_key: `bank_${key}`, setting_value: form[key], updated_at: new Date().toISOString() },
          { onConflict: 'user_id,setting_key' }
        );
      }
      setData({ ...form });
      setEditing(false);
      const logEntry: LogEntry = { id: Date.now().toString(), date: new Date().toISOString(), action: `Coordinate bancarie aggiornate (IBAN: ${form.iban})`, user: user.email || 'admin' };
      setLogs(prev => [logEntry, ...prev].slice(0, 50));
      toast.success('Dati bancari salvati ✅');
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const hasData = data.iban || data.holder;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Landmark className="w-6 h-6 text-primary" />
                I Miei Dati Bancari
              </h1>
              <p className="text-sm text-muted-foreground">Gestione coordinate bancarie e transazioni — Solo Admin</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            <ShieldCheck className="w-3.5 h-3.5" /> Area Protetta Admin
          </Badge>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="w-4 h-4 text-primary" /> Coordinate Bancarie
            </CardTitle>
            <CardDescription>IBAN e dati per ricezione pagamenti</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="coordinate">
              <TabsList className="mb-4">
                <TabsTrigger value="coordinate" className="gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Coordinate
                </TabsTrigger>
                <TabsTrigger value="transazioni" className="gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" /> Transazioni
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-1.5">
                  <History className="w-3.5 h-3.5" /> Log
                </TabsTrigger>
              </TabsList>

              {/* COORDINATE TAB */}
              <TabsContent value="coordinate">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !editing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Coordinate Bancarie</h3>
                      <Button size="sm" variant="outline" onClick={() => { setForm({ ...data }); setEditing(true); }} className="gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" /> Modifica
                      </Button>
                    </div>

                    {hasData ? (
                      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Intestatario</p>
                            <p className="font-semibold text-sm">{data.holder || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Banca
                            </p>
                            <p className="font-semibold text-sm">{data.bankName || '—'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-semibold">{data.iban || '—'}</p>
                              {data.iban && (
                                <button onClick={() => copyToClipboard(data.iban, 'iban')} className="text-muted-foreground hover:text-primary transition-colors">
                                  {copied === 'iban' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">BIC/SWIFT</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">{data.bic || '—'}</p>
                              {data.bic && (
                                <button onClick={() => copyToClipboard(data.bic, 'bic')} className="text-muted-foreground hover:text-primary transition-colors">
                                  {copied === 'bic' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                          {data.accountNumber && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">N° Conto</p>
                              <p className="font-mono text-sm">{data.accountNumber}</p>
                            </div>
                          )}
                          {data.notes && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground mb-1">Note</p>
                              <p className="text-sm">{data.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                        <Landmark className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Nessuna coordinata bancaria configurata.</p>
                        <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); setEditing(true); }} className="gap-1.5">
                          Aggiungi ora
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* EDIT FORM */
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Modifica Coordinate</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Intestatario conto *</Label>
                        <Input value={form.holder} onChange={e => setForm(f => ({ ...f, holder: e.target.value }))} placeholder="Es. CARIDI ANTONIO" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome banca</Label>
                        <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Es. Banco BPM" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">IBAN *</Label>
                        <Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="IT65F0760116200001010457131" className="h-9 text-sm font-mono" maxLength={34} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">BIC/SWIFT</Label>
                        <Input value={form.bic} onChange={e => setForm(f => ({ ...f, bic: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="BPPIITRXXX" className="h-9 text-sm font-mono" maxLength={11} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">N° Conto (opzionale)</Label>
                        <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="h-9 text-sm font-mono" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Note</Label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y" placeholder="Note sui pagamenti..." />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSave} disabled={saving || !form.iban.trim() || !form.holder.trim()} className="gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Salva
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm({ ...data }); }} className="gap-1.5">
                        <X className="w-3.5 h-3.5" /> Annulla
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">⚠️ I dati bancari sono accessibili solo agli amministratori.</p>
                  </div>
                )}
              </TabsContent>

              {/* TRANSAZIONI TAB */}
              <TabsContent value="transazioni">
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <ScrollText className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nessuna transazione registrata.</p>
                </div>
              </TabsContent>

              {/* LOG TAB */}
              <TabsContent value="log">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <History className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nessuna attività registrata.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map(l => (
                      <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border text-sm">
                        <History className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-muted-foreground">{new Date(l.date).toLocaleString('it-IT')}</p>
                          <p className="text-sm">{l.action}</p>
                          <p className="text-xs text-muted-foreground">da {l.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
