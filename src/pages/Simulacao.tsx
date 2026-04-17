import { Simulacao as SimulacaoSection } from '@/components/dashboard/sections/Simulacao';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function SimulacaoPage() {
  const { calculated, calculateSimulation, data, planejamentoLoading } = useDashboardContext();

  if (planejamentoLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SimulacaoSection
        calculateSimulation={calculateSimulation}
        currentFaturamento={calculated.faturamento_mensal}
        data={data}
      />
    </div>
  );
}
