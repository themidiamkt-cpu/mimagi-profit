import { TrendingUp, TrendingDown } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { MetricCard } from '../MetricCard';
import { BarChartComponent } from '../BarChartComponent';
import { CalculatedValues } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface Props {
  calculated: CalculatedValues;
}

export function ResultadoLucro({ calculated }: Props) {
  const isPositive = calculated.lucro_liquido >= 0;

  const chartData = [
    { name: 'Faturamento', value: calculated.faturamento_mensal, color: 'hsl(185, 60%, 35%)' },
    { name: 'Custo Produtos', value: calculated.custo_produtos, color: 'hsl(210, 60%, 15%)' },
    { name: 'Custos Fixos', value: calculated.custo_fixo_mensal, color: 'hsl(38, 92%, 50%)' },
    { name: 'Lucro Líquido', value: Math.max(0, calculated.lucro_liquido), color: isPositive ? 'hsl(142, 71%, 35%)' : 'hsl(0, 72%, 51%)' },
  ];

  return (
    <SectionCard title="8. RESULTADO & LUCRO PROJETADO" icon={isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Faturamento Mensal"
            value={formatCurrency(calculated.faturamento_mensal)}
            variant="accent"
          />
          <MetricCard
            title="Custo dos Produtos"
            value={formatCurrency(calculated.custo_produtos)}
            variant="default"
          />
          <MetricCard
            title="Lucro Bruto"
            value={formatCurrency(calculated.lucro_bruto)}
            subtitle={`${formatPercent((calculated.lucro_bruto / calculated.faturamento_mensal) * 100)} do faturamento`}
            variant="primary"
          />
          <MetricCard
            title="Lucro Líquido"
            value={formatCurrency(calculated.lucro_liquido)}
            subtitle={`Margem: ${formatPercent(calculated.margem_lucro)}`}
            variant={isPositive ? 'success' : 'warning'}
          />
        </div>

        <BarChartComponent data={chartData} title="Composição do Resultado (Mensal)" />
      </div>
    </SectionCard>
  );
}
