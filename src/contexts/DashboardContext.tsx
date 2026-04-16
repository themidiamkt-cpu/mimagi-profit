import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { usePlanejamento } from '@/hooks/usePlanejamento';
import { useCompras } from '@/hooks/useCompras';
import { useAuthContext } from '@/contexts/AuthContext';
import { PlanejamentoFinanceiro, CalculatedValues, Alert, SimulationValues } from '@/types/financial';
import { Compra, FluxoCaixaMensal, ResumoExecutivo, CalendarioCompra } from '@/types/compras';
import { blingApi } from '@/lib/blingApi';
import { getCurrentMonthKey } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';

interface ActualMetrics {
  valor_total: number;
  qtd_pecas: number;
  ticket_medio: number;
}

interface ActualMetricsByPublico {
  menina: ActualMetrics;
  menino: ActualMetrics;
  bebe: ActualMetrics;
  sapatos: ActualMetrics;
  total: ActualMetrics;
}

interface DashboardContextType {
  // Planejamento
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  actualMetrics: ActualMetricsByPublico;
  alerts: Alert[];
  loading: boolean;
  saving: boolean;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
  setCanaisMesAtivo: (mes: string) => void;
  calculateSimulation: (faturamentoDesejado: number) => SimulationValues;
  recordId: string | null;

  // Compras
  compras: Compra[];
  comprasSaving: boolean;
  addCompra: (compra: Omit<Compra, 'id'>) => void;
  updateCompra: (id: string, updates: Partial<Compra>) => void;
  removeCompra: (id: string) => void;
  calcularCalendario: (compra: Compra) => CalendarioCompra;
  calcularParcelas: (compra: Compra) => any[];
  fluxoCaixa: FluxoCaixaMensal[];
  resumoExecutivo: ResumoExecutivo;
  totalComprometido: number;

  // Realizado (Bling)
  realTimeMetrics: any | null;
  brandMetrics: any[];
  brandMetricsAllTime: any[];
  productMetrics: any[];
  loadingRealTime: boolean;
  loadingWeekly: boolean;
  startDate: string;
  endDate: string;
  selectedLabel: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSelectedLabel: (label: string) => void;
  refreshRealTime: () => Promise<void>;
  weeklyMetrics: any;
  refreshWeeklyMetrics: () => Promise<void>;
  isSyncing: boolean;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const {
    data,
    calculated,
    alerts,
    loading: planejamentoLoading,
    saving: planejamentoSaving,
    updateField,
    setCanaisMesAtivo,
    calculateSimulation,
    recordId
  } = usePlanejamento(userId);

  const {
    compras,
    loading: comprasLoading,
    saving: comprasSaving,
    addCompra,
    updateCompra,
    removeCompra,
    calcularCalendario,
    calcularParcelas,
    calcularFluxoCaixa,
    calcularResumoExecutivo,
    getTotalComprometido,
  } = useCompras(recordId, calculated.custo_fixo_mensal, data.margem, calculated.faturamento_mensal, userId);

  const loading = planejamentoLoading || comprasLoading;
  const saving = planejamentoSaving || comprasSaving;
  const fluxoCaixa = calcularFluxoCaixa();
  const resumoExecutivo = calcularResumoExecutivo();
  const totalComprometido = getTotalComprometido();

  // Calcular Métricas Reais de Compras
  const actualMetrics: ActualMetricsByPublico = {
    menina: { valor_total: 0, qtd_pecas: 0, ticket_medio: 0 },
    menino: { valor_total: 0, qtd_pecas: 0, ticket_medio: 0 },
    bebe: { valor_total: 0, qtd_pecas: 0, ticket_medio: 0 },
    sapatos: { valor_total: 0, qtd_pecas: 0, ticket_medio: 0 },
    total: { valor_total: 0, qtd_pecas: 0, ticket_medio: 0 }
  };

  if (Array.isArray(compras)) {
    compras.forEach(compra => {
      const val = Number(compra.valor_total) || 0;
      const qtd = Number(compra.qtd_pecas) || 0;

      if (compra.is_sapatos) {
        actualMetrics.sapatos.valor_total += val;
        actualMetrics.sapatos.qtd_pecas += qtd;
      } else {
        const cat = String(compra.categoria) as keyof typeof actualMetrics;
        if (actualMetrics[cat] && typeof actualMetrics[cat] === 'object') {
          actualMetrics[cat].valor_total += val;
          actualMetrics[cat].qtd_pecas += qtd;
        }
      }

      actualMetrics.total.valor_total += val;
      actualMetrics.total.qtd_pecas += qtd;
    });

    // Calcular tickets médios reais
    const categories = ['menina', 'menino', 'bebe', 'sapatos', 'total'] as const;
    categories.forEach(cat => {
      if (actualMetrics[cat] && actualMetrics[cat].qtd_pecas > 0) {
        actualMetrics[cat].ticket_medio = actualMetrics[cat].valor_total / actualMetrics[cat].qtd_pecas;
      }
    });
  }

  // --- Lógica de Dados Reais do Bling ---
  const [realTimeMetrics, setRealTimeMetrics] = useState<any | null>(null);
  const [brandMetrics, setBrandMetrics] = useState<any[]>([]);
  const [brandMetricsAllTime, setBrandMetricsAllTime] = useState<any[]>([]);
  const [productMetrics, setProductMetrics] = useState<any[]>([]);
  const [loadingRealTime, setLoadingRealTime] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyMetrics, setWeeklyMetrics] = useState<any>(null);
  const [lojaNames, setLojaNames] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Buscar dados reais por semana para o mês ativo do planejamento
  const fetchWeeklyMetrics = useCallback(async () => {
    if (!data.canais_venda_mes_ativo) return;

    setLoadingWeekly(true);
    try {
      const { start, end } = blingApi.getMonthDateRange(data.canais_venda_mes_ativo);
      const orders = await blingApi.getLocalPedidos(start, end);

      const brandProductMap: Record<string, string> = {};
      const { data: products } = await supabase.from('bling_produtos').select('codigo, marca');
      products?.forEach(p => {
        if (p.codigo) brandProductMap[p.codigo] = p.marca;
      });

      const weekly = blingApi.getWeeklyChannelMetrics(orders, data.canais_venda_mes_ativo, undefined, brandProductMap);
      setWeeklyMetrics(weekly);
    } catch (err) {
      console.error('Erro ao buscar métricas semanais:', err);
    } finally {
      setLoadingWeekly(false);
    }
  }, [data.canais_venda_mes_ativo]);

  useEffect(() => {
    fetchWeeklyMetrics();
  }, [data.canais_venda_mes_ativo]);

  // Estados de data (Mês Atual por padrão)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [selectedLabel, setSelectedLabel] = useState('Este Mês');

  // Busca nomes das lojas uma única vez
  useEffect(() => {
    const fetchLojas = async () => {
      try {
        const response = await blingApi.getCanaisVenda();
        const data = response.data || [];
        const mapping: Record<string, string> = {};
        data.forEach((l: any) => {
          mapping[String(l.id)] = l.descricao || l.nome;
        });
        setLojaNames(mapping);
      } catch (error) {
        console.error('Erro ao buscar nomes das lojas no Contexto:', error);
      }
    };
    if (userId) fetchLojas();
  }, [userId]);

  const fetchRealTimeMetrics = useCallback(async () => {
    if (!userId) return;

    setLoadingRealTime(true);
    try {
      // Busca pedidos do cache local para o período selecionado
      const pedidos = await blingApi.getLocalPedidos(startDate, endDate);
      const metrics = blingApi.calculateMetrics(pedidos, lojaNames);

      // Busca métricas de marcas e produtos
      const [brands, products] = await Promise.all([
        blingApi.getSalesByBrand(startDate, endDate),
        blingApi.getSalesByProduct(startDate, endDate)
      ]);

      setRealTimeMetrics(metrics);
      setBrandMetrics(brands);
      setProductMetrics(products);
    } catch (error) {
      console.error('Erro ao carregar métricas reais:', error);
    } finally {
      setLoadingRealTime(false);
    }
  }, [userId, lojaNames, startDate, endDate]);

  useEffect(() => {
    fetchRealTimeMetrics();
  }, [fetchRealTimeMetrics]);

  // Busca métricas de marcas "Todo o Período" para o simulador
  const fetchAllTimeMetrics = useCallback(async () => {
    if (!userId) return;
    try {
      const brands = await blingApi.getSalesByBrand(); // Sem parâmetros = todo o período
      setBrandMetricsAllTime(brands);
    } catch (error) {
      console.error('Erro ao carregar métricas de marcas (todo o período):', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchAllTimeMetrics();
  }, [fetchAllTimeMetrics]);

  // --- Sincronização Automática em Background ---
  useEffect(() => {
    if (!userId) return;

    // Sincroniza imediatamente ao carregar
    const performSync = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
        console.log('Iniciando sincronização automática com Bling...');
        await blingApi.syncPedidosToLocal();
        console.log('Sincronização automática concluída.');
      } catch (error) {
        console.error('Erro na sincronização automática:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    performSync();

    // Sincroniza a cada 10 minutos
    const interval = setInterval(performSync, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // --- Supabase Realtime Listener ---
  // Atualiza as métricas sempre que a tabela de pedidos local mudar
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('bling_pedidos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bling_pedidos',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Mudança detectada em bling_pedidos via Realtime. Atualizando métricas...');
          fetchRealTimeMetrics();
          fetchWeeklyMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchRealTimeMetrics, fetchWeeklyMetrics]);

  return (
    <DashboardContext.Provider value={{
      data,
      calculated,
      actualMetrics,
      alerts,
      loading,
      saving,
      updateField,
      setCanaisMesAtivo,
      calculateSimulation,
      recordId,
      compras,
      comprasSaving,
      addCompra,
      updateCompra,
      removeCompra,
      calcularCalendario,
      calcularParcelas,
      fluxoCaixa,
      resumoExecutivo,
      totalComprometido,
      realTimeMetrics,
      brandMetrics,
      productMetrics,
      brandMetricsAllTime,
      loadingRealTime,
      loadingWeekly,
      startDate,
      endDate,
      selectedLabel,
      setStartDate,
      setEndDate,
      setSelectedLabel,
      refreshRealTime: fetchRealTimeMetrics,
      weeklyMetrics,
      refreshWeeklyMetrics: fetchWeeklyMetrics,
      isSyncing,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}
