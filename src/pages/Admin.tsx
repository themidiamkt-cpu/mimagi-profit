import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Users, LogOut, Shield, Database, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PendingUser {
  id: string;
  nome: string;
  email: string;
  nome_loja: string | null;
  instagram_loja: string | null;
  whatsapp: string | null;
  faturamento_atual: number | null;
  created_at: string;
  is_bling?: boolean;
}

export default function Admin() {
  const { signOut } = useAuthContext();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/variaveis', { replace: true });
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // 1. Fetch ALL roles first (simpler than doing multiple restricted queries)
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // 2. Fetch ALL profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // 3. Fetch Bling configs
      const { data: allBlingConfigs, error: blingError } = await supabase
        .from('bling_config')
        .select('user_id, api_key, access_token');

      if (blingError) {
        console.warn('Error fetching bling configs:', blingError);
      }

      // 4. Join logic
      const profileMap = new Map(allProfiles?.map(p => [p.id, p]) || []);
      const blingMap = new Map((allBlingConfigs || [])
        .map(b => [b.user_id, !!(b.api_key || b.access_token)]));

      const processedUsers: PendingUser[] = (allRoles || []).map(roleRecord => {
        const profile = profileMap.get(roleRecord.user_id);
        return {
          id: roleRecord.user_id,
          nome: profile?.nome || 'Usuário sem nome',
          email: profile?.email || 'E-mail não vinculado',
          nome_loja: profile?.nome_loja || null,
          instagram_loja: profile?.instagram_loja || null,
          whatsapp: profile?.whatsapp || null,
          faturamento_atual: profile?.faturamento_atual || null,
          created_at: roleRecord.created_at || profile?.created_at || new Date().toISOString(),
          is_bling: blingMap.get(roleRecord.user_id) || false
        };
      });

      // 4. Categorize
      // Pending: role is 'pending'
      const pending = (allRoles || [])
        .filter(r => r.role === 'pending')
        .map(r => processedUsers.find(u => u.id === r.user_id))
        .filter(Boolean) as PendingUser[];

      // Approved: role is 'user' OR 'admin'
      const approved = (allRoles || [])
        .filter(r => r.role === 'user' || r.role === 'admin')
        .map(r => processedUsers.find(u => u.id === r.user_id))
        .filter(Boolean) as PendingUser[];

      setPendingUsers(pending);
      setApprovedUsers(approved);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Usuário aprovado!',
        description: 'O usuário agora pode acessar a plataforma.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      // Delete role (keep pending status or remove entirely)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Usuário rejeitado',
        description: 'O acesso foi negado.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar o usuário.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-medium">Painel Admin</h1>
              <p className="text-muted-foreground text-sm">Gerenciar aprovações de usuários</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{pendingUsers.length + approvedUsers.length}</p>
                </div>
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos / Aprovados</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedUsers.length}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingUsers.length}</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <CardTitle>Aguardando Aprovação</CardTitle>
              <Badge variant="secondary" className="ml-2">{pendingUsers.length}</Badge>
            </div>
            <CardDescription>Usuários que solicitaram acesso à plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário aguardando aprovação
              </p>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{user.nome}</h3>
                        <Badge variant="outline" className="text-xs">
                          {user.nome_loja || 'Sem loja'}
                        </Badge>
                        {user.is_bling ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1 border-blue-200">
                            <Database className="w-3 h-3" /> Bling
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 gap-1 border-slate-200">
                            <Smartphone className="w-3 h-3" /> Planilha
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>📧 {user.email}</p>
                        <p>📱 {user.whatsapp || 'Não informado'}</p>
                        <p>📸 {user.instagram_loja || 'Não informado'}</p>
                        <p>💰 Faturamento: {formatCurrency(user.faturamento_atual)}</p>
                        <p className="text-xs">Cadastro: {formatDate(user.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle>Usuários Aprovados</CardTitle>
              <Badge variant="secondary" className="ml-2">{approvedUsers.length}</Badge>
            </div>
            <CardDescription>Usuários com acesso ativo à plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            {approvedUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário aprovado ainda
              </p>
            ) : (
              <div className="space-y-4">
                {approvedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{user.nome}</h3>
                        <Badge variant="outline" className="text-xs">
                          {user.nome_loja || 'Sem loja'}
                        </Badge>
                        {user.is_bling ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1 border-blue-200">
                            <Database className="w-3 h-3" /> Bling
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 gap-1 border-slate-200">
                            <Smartphone className="w-3 h-3" /> Planilha
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email} • {user.whatsapp || 'Sem Whats'}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
                      Ativo
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
