import { Target } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { CalculatedValues } from '@/types/financial';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface Props {
  calculated: CalculatedValues;
}

export function PontoEquilibrio({ calculated }: Props) {
  return (
    <SectionCard title="9. PONTO DE EQUILÍBRIO" icon={<Target className="w-5 h-5" />}>
      <div className="bg-muted/50 border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Faturamento Mínimo Mensal</p>
            <p className="text-4xl font-bold font-mono text-accent">{formatCurrency(calculated.faturamento_minimo_mensal)}</p>
            <p className="text-sm text-muted-foreground mt-2">para cobrir todos os custos fixos</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Quantidade Mínima de Peças</p>
            <p className="text-4xl font-bold font-mono text-primary">{formatNumber(calculated.pecas_minimas_mensal)}</p>
            <p className="text-sm text-muted-foreground mt-2">vendas por mês</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-center text-foreground">
            <strong>Você precisa faturar {formatCurrency(calculated.faturamento_minimo_mensal)}/mês para não ter prejuízo.</strong>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Isso equivale a aproximadamente {formatNumber(calculated.pecas_minimas_mensal)} peças vendidas por mês.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
