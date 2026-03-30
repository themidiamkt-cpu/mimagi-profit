import { Simulacao as SimulacaoSection } from '@/components/dashboard/sections/Simulacao';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function SimulacaoPage() {
  const { calculated, calculateSimulation } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <SimulacaoSection calculateSimulation={calculateSimulation} currentFaturamento={calculated.faturamento_mensal} />
    </div>
  );
}
