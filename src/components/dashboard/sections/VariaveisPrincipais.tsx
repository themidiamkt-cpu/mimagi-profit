import { DollarSign, TrendingUp } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { MetricCard } from '../MetricCard';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function VariaveisPrincipais({ data, calculated, updateField }: Props) {
  const handleFaturamentoChange = (value: number) => {
    // Calculate investment from revenue: investimento_mensal = faturamento_mensal / margem
    const investimentoMensal = value / data.margem;
    const investimentoCiclo = investimentoMensal * 6;
    updateField('investimento_ciclo', investimentoCiclo);
  };

  const handleMargemChange = (value: number) => {
    // If margem changes, we want to keep the same Revenue goal, 
    // so we must recalculate the required investment.
    updateField('margem', value);
    const investimentoMensal = calculated.faturamento_mensal / value;
    const investimentoCiclo = investimentoMensal * 6;
    updateField('investimento_ciclo', investimentoCiclo);
  };

  return (
    <SectionCard title="1. VARIÁVEIS PRINCIPAIS" icon={<DollarSign className="w-5 h-5" />}>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <InputField
          label="Faturamento Mensal Desejado"
          value={calculated.faturamento_mensal}
          onChange={(v) => handleFaturamentoChange(v as number)}
          prefix="R$"
          step={1000}
        />
        <InputField
          label="Margem (Markup)"
          value={data.margem}
          onChange={(v) => handleMargemChange(v as number)}
          suffix="x"
          step={0.1}
          min={1}
        />
      </div>


      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground   tracking-wide">Investimento</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title="Investimento por Ciclo"
            value={formatCurrency(data.investimento_ciclo)}
            subtitle="6 meses"
            variant="primary"
          />
          <MetricCard
            title="Investimento Mensal"
            value={formatCurrency(calculated.investimento_mensal)}
            subtitle="por mês"
            variant="primary"
          />
          <MetricCard
            title="Margem Aplicada"
            value={`${data.margem}x`}
            subtitle={`${((data.margem - 1) * 100).toFixed(0)}% de lucro bruto`}
            variant="default"
          />
        </div>

        <h4 className="text-sm font-medium text-muted-foreground   tracking-wide mt-6">Faturamento</h4>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <MetricCard
            title="Faturamento por Ciclo"
            value={formatCurrency(calculated.faturamento_ciclo)}
            subtitle="6 meses"
            variant="success"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricCard
            title="Faturamento Mensal"
            value={formatCurrency(calculated.faturamento_mensal)}
            subtitle="por mês"
            variant="primary"
          />
        </div>
      </div>
    </SectionCard>
  );
}
