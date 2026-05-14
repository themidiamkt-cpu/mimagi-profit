import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, Clock, TrendingUp, Wallet, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";


interface DashboardStats {
  dueToday: number;
  dueTomorrow: number;
  totalPending: number;
  totalOverdue: number;
  dueTodayAmount: number;
  dueTomorrowAmount: number;
  totalPendingAmount: number;
  totalOverdueAmount: number;
  totalGeneralAmount: number;
  forecastThisMonth: number;
}

export interface DashboardRef {
  refresh: () => void;
}

export const Dashboard = forwardRef<DashboardRef>((_, ref) => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({

    dueToday: 0,
    dueTomorrow: 0,
    totalPending: 0,
    totalOverdue: 0,
    dueTodayAmount: 0,
    dueTomorrowAmount: 0,
    totalPendingAmount: 0,
    totalOverdueAmount: 0,
    totalGeneralAmount: 0,
    forecastThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Get current month range
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      // Buscar todas as parcelas não pagas (em lotes para evitar o limite de 1000)
      let unpaidInstallments: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from("installments")
          .select("amount, status, due_date")
          .eq("user_id", user?.id)
          .in("status", ["pendente", "atrasado"])

          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          unpaidInstallments = [...unpaidInstallments, ...data];
          page++;
        } else {
          hasMore = false;
        }
      }

      if (!unpaidInstallments) {
        setLoading(false);
        return;
      }

      const overdueItems = unpaidInstallments.filter(i =>
        i.status === 'atrasado' || (i.status === 'pendente' && i.due_date < today)
      );

      const pendingItems = unpaidInstallments.filter(i =>
        i.status === 'pendente' && i.due_date >= today
      );

      const todayItems = unpaidInstallments.filter(i =>
        i.status === 'pendente' && i.due_date === today
      );

      const tomorrowItems = unpaidInstallments.filter(i =>
        i.status === 'pendente' && i.due_date === tomorrowStr
      );

      const thisMonthItems = unpaidInstallments.filter(i =>
        i.due_date >= firstDayOfMonth && i.due_date <= lastDayOfMonth
      );

      setStats({
        dueToday: todayItems.length,
        dueTomorrow: tomorrowItems.length,
        totalPending: pendingItems.length,
        totalOverdue: overdueItems.length,
        dueTodayAmount: todayItems.reduce((sum, i) => sum + Number(i.amount), 0),
        dueTomorrowAmount: tomorrowItems.reduce((sum, i) => sum + Number(i.amount), 0),
        totalPendingAmount: pendingItems.reduce((sum, i) => sum + Number(i.amount), 0),
        totalOverdueAmount: overdueItems.reduce((sum, i) => sum + Number(i.amount), 0),
        totalGeneralAmount: unpaidInstallments.reduce((sum, i) => sum + Number(i.amount), 0),
        forecastThisMonth: thisMonthItems.reduce((sum, i) => sum + Number(i.amount), 0),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchStats,
  }));

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for dashboard refresh events (when tabs/installments are deleted)
  useEffect(() => {
    const handleRefresh = () => {
      fetchStats();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Linha principal - Valores totais */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <div className="metric-card-header flex items-center justify-between">
            <span>Total Geral em Aberto</span>
            <Wallet className="h-4 w-4 opacity-70" />
          </div>
          <div className="px-4 py-5">
            <div className="text-[28px] font-medium text-primary">
              R$ {stats.totalGeneralAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 font-normal">
              {stats.totalPending + stats.totalOverdue} parcelas
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header flex items-center justify-between">
            <span>Total Pendente</span>
            <Clock className="h-4 w-4 opacity-70" />
          </div>
          <div className="px-4 py-5">
            <div className="text-[28px] font-medium text-primary/80">
              R$ {stats.totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 font-normal">
              {stats.totalPending} parcelas pendentes
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header flex items-center justify-between">
            <span>Total Atrasado</span>
            <AlertCircle className="h-4 w-4 opacity-70" />
          </div>
          <div className="px-4 py-5">
            <div className="text-[28px] font-medium text-destructive">
              R$ {stats.totalOverdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 font-normal">
              {stats.totalOverdue} parcelas atrasadas
            </p>
          </div>
        </div>
      </div>

      {/* Linha secundária - Detalhes diários e previsão */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-muted-foreground">Vencem Hoje</span>
            <Calendar className="h-4 w-4 text-primary opacity-60" />
          </div>
          <div className="text-2xl font-medium text-foreground">{stats.dueToday}</div>
          <p className="text-[12px] text-muted-foreground mt-1 font-normal">
            R$ {stats.dueTodayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-muted-foreground">Vencem Amanhã</span>
            <TrendingUp className="h-4 w-4 text-primary opacity-60" />
          </div>
          <div className="text-2xl font-medium text-foreground">{stats.dueTomorrow}</div>
          <p className="text-[12px] text-muted-foreground mt-1 font-normal">
            R$ {stats.dueTomorrowAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-none lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-muted-foreground">Previsão do Mês</span>
            <Target className="h-4 w-4 text-primary opacity-60" />
          </div>
          <div className="text-2xl font-medium text-foreground">
            R$ {stats.forecastThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1 font-normal">
            Parcelas a receber em {new Date().toLocaleString('pt-BR', { month: 'long' })}
          </p>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = "Dashboard";
