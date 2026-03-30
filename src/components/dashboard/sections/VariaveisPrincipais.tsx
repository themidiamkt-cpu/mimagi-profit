import { useState } from 'react';
import { DollarSign, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { MetricCard } from '../MetricCard';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

type InputMode = 'investimento' | 'faturamento';

export function VariaveisPrincipais({ data, calculated, updateField }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('investimento');
  const [faturamentoMensalInput, setFaturamentoMensalInput] = useState<number>(calculated.faturamento_mensal);

  const handleModeToggle = () => {
    if (inputMode === 'investimento') {
      setFaturamentoMensalInput(calculated.faturamento_mensal);
      setInputMode('faturamento');
    } else {
      setInputMode('investimento');
    }
  };

  const handleFaturamentoChange = (value: number) => {
    setFaturamentoMensalInput(value);
    // Calculate investment from revenue: investimento_mensal = faturamento_mensal / margem
    const investimentoMensal = value / data.margem;
    const investimentoCiclo = investimentoMensal * 6;
    updateField('investimento_ciclo', investimentoCiclo);
  };

  return (
    <SectionCard title="1. VARIÁVEIS PRINCIPAIS" icon={<DollarSign className="w-5 h-5" />}>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleModeToggle}
          className="flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          {inputMode === 'investimento' ? 'Calcular por Faturamento' : 'Calcular por Investimento'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {inputMode === 'investimento' ? (
          <InputField
            label="Investimento Total por Ciclo (6 meses)"
            value={data.investimento_ciclo}
            onChange={(v) => updateField('investimento_ciclo', v as number)}
            prefix="R$"
            step={1000}
          />
        ) : (
          <InputField
            label="Faturamento Mensal Desejado"
            value={faturamentoMensalInput}
            onChange={(v) => handleFaturamentoChange(v as number)}
            prefix="R$"
            step={1000}
          />
        )}
        <InputField
          label="Margem (Markup)"
          value={data.margem}
          onChange={(v) => updateField('margem', v as number)}
          suffix="x"
          step={0.1}
          min={1}
        />
      </div>
      
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Investimento</h4>
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

        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Faturamento</h4>
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
            variant="accent"
          />
        </div>
      </div>
    </SectionCard>
  );
}
