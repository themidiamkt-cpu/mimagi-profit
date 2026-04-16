import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const { loading, saving } = useDashboardContext();
  const { profile } = useAuthContext();
  const isTheMidiaMkt = profile?.email === 'themidiamkt@gmail.com';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando planejamento...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isTheMidiaMkt && <AppSidebar />}
        <SidebarInset className="flex-1 flex flex-col bg-background">
          <header className="h-12 border-b border-border-subtle flex items-center justify-between px-4 bg-bg-primary shrink-0">
            <div className="flex items-center gap-4">
              {!isTheMidiaMkt && <SidebarTrigger className="text-text-secondary hover:text-text-primary" />}
              <span className="text-sm text-text-secondary font-medium">Mimagi Profit Planner</span>
            </div>
            {saving && (
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
