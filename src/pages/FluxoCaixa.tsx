import { FluxoCaixa as FluxoCaixaSection } from '@/components/dashboard/sections/FluxoCaixa';
import { VisaoDiretoria } from '@/components/dashboard/sections/VisaoDiretoria';
import { useDashboardContext } from '@/contexts/DashboardContext';

export default function FluxoCaixa() {
  const { calculated, fluxoCaixa, resumoExecutivo, totalComprometido } = useDashboardContext();

  return (
    <div className="space-y-6 animate-fade-in">
      <VisaoDiretoria resumo={resumoExecutivo} totalComprometido={totalComprometido} />
      <FluxoCaixaSection fluxoCaixa={fluxoCaixa} faturamentoMensal={calculated.faturamento_mensal} />
    </div>
  );
}
