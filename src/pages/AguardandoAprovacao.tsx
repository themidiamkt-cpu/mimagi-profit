import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function AguardandoAprovacao() {
  const { signOut, profile } = useAuthContext();
  const { isApproved, refetch, loading } = useUserRole();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isApproved) {
      navigate('/variaveis', { replace: true });
    }
  }, [isApproved, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-base mt-2">
            Olá, {profile?.nome || 'Usuário'}! Seu cadastro foi recebido com sucesso.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Seu acesso está sendo analisado pelo administrador. Assim que for aprovado, você poderá acessar a plataforma normalmente.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-1">Informações do cadastro:</p>
            <p className="text-muted-foreground">Loja: {profile?.nome_loja || '-'}</p>
            <p className="text-muted-foreground">Email: {profile?.email || '-'}</p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="w-full"
            disabled={loading || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Verificar status
          </Button>
          
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
