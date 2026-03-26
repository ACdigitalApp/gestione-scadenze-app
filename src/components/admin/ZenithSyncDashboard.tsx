import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useZenithSync } from '@/hooks/useZenithSync';
import { useAdmin } from '@/hooks/useAdmin';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export const ZenithSyncDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { 
    settings, 
    settingsLoading, 
    logs, 
    logsLoading,
    triggerSync, 
    isSyncing,
    updateSettings,
    isUpdatingSettings,
  } = useZenithSync();

  const [syncInterval, setSyncInterval] = useState<number[]>([60]);

  // Redirect non-admin users
  if (!adminLoading && !isAdmin) {
    navigate('/');
    return null;
  }

  if (adminLoading || settingsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Caricamento...</h1>
        </div>
      </div>
    );
  }

  const handleToggleSync = async (enabled: boolean) => {
    updateSettings({ enabled });
  };

  const handleToggleAutoSync = async (auto_sync: boolean) => {
    updateSettings({ auto_sync });
  };

  const handleUpdateInterval = async () => {
    updateSettings({ sync_interval: syncInterval[0] });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Successo</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Parziale</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallito</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateStats = () => {
    if (!logs || logs.length === 0) {
      return {
        totalSynced: 0,
        successRate: 0,
        lastSync: null,
      };
    }

    const totalSynced = logs.reduce((sum, log) => sum + (log.records_synced || 0), 0);
    const successCount = logs.filter(log => log.status === 'success').length;
    const successRate = (successCount / logs.length) * 100;
    const lastSync = logs[0]?.completed_at || logs[0]?.started_at;

    return { totalSynced, successRate, lastSync };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Sincronizzazione Zenith Finances</h1>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Impostazioni di Sincronizzazione</CardTitle>
          <CardDescription>
            Configura la sincronizzazione automatica con Zenith Finances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-enabled">Sincronizzazione Abilitata</Label>
              <p className="text-sm text-muted-foreground">
                Abilita o disabilita la sincronizzazione con Zenith Finances
              </p>
            </div>
            <Switch
              id="sync-enabled"
              checked={settings?.enabled || false}
              onCheckedChange={handleToggleSync}
              disabled={isUpdatingSettings}
            />
          </div>

          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Sincronizzazione Automatica</Label>
              <p className="text-sm text-muted-foreground">
                Esegui sincronizzazione automatica in base all'intervallo configurato
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={settings?.auto_sync || false}
              onCheckedChange={handleToggleAutoSync}
              disabled={isUpdatingSettings || !settings?.enabled}
            />
          </div>

          {/* Sync Interval */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label htmlFor="sync-interval">Intervallo di Sincronizzazione</Label>
              <p className="text-sm text-muted-foreground">
                Tempo tra le sincronizzazioni automatiche (minuti)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                id="sync-interval"
                min={30}
                max={240}
                step={30}
                value={syncInterval}
                onValueChange={setSyncInterval}
                disabled={!settings?.enabled || !settings?.auto_sync}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-right">{syncInterval[0]} min</span>
            </div>
            {syncInterval[0] !== settings?.sync_interval && (
              <Button 
                onClick={handleUpdateInterval}
                disabled={isUpdatingSettings}
                size="sm"
              >
                Salva Intervallo
              </Button>
            )}
          </div>

          {/* Manual Trigger */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => triggerSync()}
              disabled={isSyncing || !settings?.enabled}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizzazione in corso...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizza Ora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ultima Sincronizzazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSync ? (
                formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true, locale: it })
              ) : (
                'Mai'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Record Sincronizzati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSynced}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasso di Successo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cronologia Sincronizzazioni</CardTitle>
          <CardDescription>Ultimi 20 tentativi di sincronizzazione</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Record Sincronizzati</TableHead>
                    <TableHead>Errori</TableHead>
                    <TableHead>Avviato Da</TableHead>
                    <TableHead>Durata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const duration = log.completed_at && log.started_at
                      ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {new Date(log.created_at).toLocaleString('it-IT')}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.records_synced || 0}</TableCell>
                        <TableCell>
                          {log.records_failed > 0 ? (
                            <span className="text-red-500">{log.records_failed}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.triggered_by || 'unknown'}</Badge>
                        </TableCell>
                        <TableCell>
                          {duration !== null ? `${duration}s` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna sincronizzazione ancora eseguita
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
