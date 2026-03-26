import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncSettings {
  id: string;
  enabled: boolean;
  sync_interval: number;
  last_sync_at: string | null;
  zenith_url: string | null;
  auto_sync: boolean;
  updated_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: 'success' | 'partial' | 'failed';
  records_synced: number;
  records_failed: number;
  error_details: any;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

interface SyncResult {
  success: boolean;
  synced: {
    transactions: number;
    categories: number;
    reminders: number;
    payment_methods: number;
  };
  errors: string[];
  timestamp: string;
}

export const useZenithSync = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['sync-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;
      return data as SyncSettings;
    },
  });

  // Fetch sync logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SyncLog[];
    },
  });

  // Trigger manual sync
  const triggerSync = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-from-zenith`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ triggeredBy: 'manual' }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-settings'] });
      
      if (data.success) {
        const total = Object.values(data.synced).reduce((a, b) => a + b, 0);
        toast({
          title: 'Sincronizzazione completata',
          description: `${total} record sincronizzati con successo`,
        });
      } else {
        toast({
          title: 'Sincronizzazione parziale',
          description: `Alcuni errori si sono verificati: ${data.errors.join(', ')}`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore di sincronizzazione',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update sync settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SyncSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sync_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .select()
        .single();

      if (error) throw error;
      return data as SyncSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-settings'] });
      toast({
        title: 'Impostazioni aggiornate',
        description: 'Le impostazioni di sincronizzazione sono state salvate',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    settingsLoading,
    logs,
    logsLoading,
    triggerSync: triggerSync.mutate,
    isSyncing: triggerSync.isPending,
    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,
  };
};
