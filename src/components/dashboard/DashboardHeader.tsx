import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  saving: boolean;
}

export function DashboardHeader({ saving }: DashboardHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MIMAGI PROFIT PLANNER</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">Dashboard Financeiro Corporativo</p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
