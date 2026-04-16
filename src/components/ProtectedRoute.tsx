import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { isAuthenticated, profile, loading: authLoading } = useAuthContext();
  const { isAdmin, isApproved, loading: roleLoading } = useUserRole();
  const location = useLocation();

  const loading = authLoading || roleLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin route check
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/variaveis" replace />;
  }

  // 4. Case-specific restriction for themidiamkt@gmail.com
  // They should ONLY see the admin page
  const isTheMidiaMkt = profile?.email === 'themidiamkt@gmail.com';
  if (isTheMidiaMkt && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />;
  }

  // Regular user approval check (skip for admin routes)
  if (!requireAdmin && !isApproved) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  return <>{children}</>;
}
