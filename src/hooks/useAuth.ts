import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string;
  nome_loja: string | null;
  instagram_loja: string | null;
  faturamento_atual: number;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  nome: string;
  whatsapp: string;
  email: string;
  password: string;
  nome_loja: string;
  instagram_loja: string;
  faturamento_atual: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data as Profile);
        return;
      }

      const fallbackName =
        authUser.user_metadata?.nome ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Usuário';

      const profilePayload = {
        id: authUser.id,
        nome: fallbackName,
        email: authUser.email ?? '',
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating missing profile:', insertError);
        return;
      }

      if (insertedProfile) {
        setProfile(insertedProfile as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  // Setup auth state listener FIRST, then check session
  useEffect(() => {
    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        // Defer profile fetch to avoid blocking
        setTimeout(() => {
          fetchProfile(newSession.user);
        }, 0);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchProfile(existingSession.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (signUpData: SignUpData) => {
    try {
      // 1. Create auth user with metadata
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email.trim().toLowerCase(),
        password: signUpData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            nome: signUpData.nome,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // 2. Update profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: signUpData.nome,
            whatsapp: signUpData.whatsapp,
            nome_loja: signUpData.nome_loja,
            instagram_loja: signUpData.instagram_loja,
            faturamento_atual: signUpData.faturamento_atual,
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        toast({
          title: 'Conta criada com sucesso!',
          description: 'Bem-vindo ao MIMAGI Profit Planner.',
        });

        return { success: true };
      }

      return { success: false, error: 'Erro desconhecido ao criar conta' };
    } catch (error: any) {
      console.error('SignUp error:', error);
      
      let message = 'Não foi possível criar a conta.';
      if (error.message?.includes('already registered')) {
        message = 'Este email já está cadastrado.';
      }
      
      toast({
        title: 'Erro ao criar conta',
        description: message,
        variant: 'destructive',
      });

      return { success: false, error: message };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        await fetchProfile(data.session.user);
      }

      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('SignIn error:', error);
      
      let message = 'Não foi possível fazer login.';
      if (error.message?.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Confirme seu email antes de fazer login.';
      }

      toast({
        title: 'Erro ao fazer login',
        description: message,
        variant: 'destructive',
      });

      return { success: false, error: message };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
    } catch (error) {
      console.error('SignOut error:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Update profile error:', error);
      
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Não foi possível atualizar suas informações.',
        variant: 'destructive',
      });

      return { success: false, error: error.message };
    }
  }, [user]);

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!session,
  };
}
