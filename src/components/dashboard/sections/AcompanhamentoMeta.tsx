import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { MetricCard } from '../MetricCard';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function AcompanhamentoMeta({ data, calculated, updateField }: Props) {
  const metaMensal = calculated.faturamento_mensal;
  const realizado = data.faturamento_realizado;
  const falta = metaMensal - realizado;
  const percentAtingido = metaMensal > 0 ? (realizado / metaMensal) * 100 : 0;
  const atingiuMeta = realizado >= metaMensal;

  return (
    <SectionCard title="ACOMPANHAMENTO DE META" icon={<Target className="w-5 h-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <InputField
            label="Faturamento Realizado (Mês Atual)"
            value={data.faturamento_realizado}
            onChange={(v) => updateField('faturamento_realizado', v as number)}
            prefix="R$"
          />
        </div>
        
        <MetricCard
          title="Meta Mensal Planejada"
          value={formatCurrency(metaMensal)}
          variant="default"
        />
        
        <MetricCard
          title="% da Meta Atingida"
          value={formatPercent(percentAtingido)}
          variant={percentAtingido >= 100 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 border ${atingiuMeta ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            {atingiuMeta ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-amber-500" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {atingiuMeta ? 'Meta Atingida!' : 'Falta para Meta'}
            </span>
          </div>
          <p className={`text-2xl font-mono font-bold ${atingiuMeta ? 'text-green-500' : 'text-amber-500'}`}>
            {atingiuMeta ? '+' : ''}{formatCurrency(atingiuMeta ? realizado - metaMensal : falta)}
          </p>
        </div>

        <div className="p-4 border border-border bg-muted/20">
          <div className="text-sm text-muted-foreground mb-2">Progresso</div>
          <div className="w-full h-4 bg-muted rounded-none overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                percentAtingido >= 100 ? 'bg-green-500' : 
                percentAtingido >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentAtingido, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
            <span>R$ 0</span>
            <span>{formatCurrency(metaMensal)}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
