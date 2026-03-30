import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'user' | 'pending';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuthContext();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRole(user.id);
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching role:', error);
        setRole('pending');
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        setRole('pending');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole('pending');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';
  const isApproved = role === 'admin' || role === 'user';
  const isPending = role === 'pending';

  const refetch = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchRole(user.id);
    }
  }, [user]);

  return {
    role,
    loading,
    isAdmin,
    isApproved,
    isPending,
    refetch,
  };
}
