import { createContext, useContext, ReactNode } from 'react';
import { usePlanejamento } from '@/hooks/usePlanejamento';
import { useCompras } from '@/hooks/useCompras';
import { useAuthContext } from '@/contexts/AuthContext';
import { PlanejamentoFinanceiro, CalculatedValues, Alert, SimulationValues } from '@/types/financial';
import { Compra, FluxoCaixaMensal, ResumoExecutivo, CalendarioCompra } from '@/types/compras';

interface DashboardContextType {
  // Planejamento
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  alerts: Alert[];
  loading: boolean;
  saving: boolean;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
  calculateSimulation: (faturamentoDesejado: number) => SimulationValues;
  recordId: string | null;
  
  // Compras
  compras: Compra[];
  comprasSaving: boolean;
  addCompra: (compra: Omit<Compra, 'id'>) => void;
  updateCompra: (id: string, updates: Partial<Compra>) => void;
  removeCompra: (id: string) => void;
  calcularCalendario: (compra: Compra) => CalendarioCompra;
  fluxoCaixa: FluxoCaixaMensal[];
  resumoExecutivo: ResumoExecutivo;
  totalComprometido: number;
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
    calcularFluxoCaixa,
    calcularResumoExecutivo,
    getTotalComprometido,
  } = useCompras(recordId, calculated.custo_fixo_mensal, data.margem, calculated.faturamento_mensal, userId);

  const loading = planejamentoLoading || comprasLoading;
  const saving = planejamentoSaving || comprasSaving;
  const fluxoCaixa = calcularFluxoCaixa();
  const resumoExecutivo = calcularResumoExecutivo();
  const totalComprometido = getTotalComprometido();

  return (
    <DashboardContext.Provider value={{
      data,
      calculated,
      alerts,
      loading,
      saving,
      updateField,
      calculateSimulation,
      recordId,
      compras,
      comprasSaving,
      addCompra,
      updateCompra,
      removeCompra,
      calcularCalendario,
      fluxoCaixa,
      resumoExecutivo,
      totalComprometido,
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
