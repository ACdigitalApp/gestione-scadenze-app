import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AdminContextType {
  isAdmin: boolean;
  guestModeEnabled: boolean;
  loading: boolean;
  toggleGuestMode: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestModeEnabled, setGuestModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Hardcoded admin bypass
    if (user.email === 'acdigital.app@gmail.com') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    try {
      // Check if user has admin role using RPC
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (err) {
      console.error('Error:', err);
      setIsAdmin(false);
    }

    setLoading(false);
  };

  const fetchGuestMode = async () => {
    try {
      const { data, error } = await supabase.rpc('get_guest_mode');
      
      if (error) {
        console.error('Error fetching guest mode:', error);
        setGuestModeEnabled(false);
      } else {
        setGuestModeEnabled(data === true);
      }
    } catch (err) {
      console.error('Error:', err);
      setGuestModeEnabled(false);
    }
  };

  const toggleGuestMode = async () => {
    if (!isAdmin) return;

    try {
      const newValue = !guestModeEnabled;
      
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: { enabled: newValue },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'guest_mode');

      if (error) {
        console.error('Error toggling guest mode:', error);
        throw error;
      }

      setGuestModeEnabled(newValue);
    } catch (err) {
      console.error('Error:', err);
      throw err;
    }
  };

  const refetch = async () => {
    await Promise.all([fetchAdminStatus(), fetchGuestMode()]);
  };

  useEffect(() => {
    fetchAdminStatus();
    fetchGuestMode();
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, guestModeEnabled, loading, toggleGuestMode, refetch }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
