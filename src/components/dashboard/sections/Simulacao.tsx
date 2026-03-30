import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { SimulationValues } from '@/types/financial';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface Props {
  calculateSimulation: (faturamento: number) => SimulationValues;
  currentFaturamento: number;
}

export function Simulacao({ calculateSimulation, currentFaturamento }: Props) {
  const [faturamentoDesejado, setFaturamentoDesejado] = useState(currentFaturamento * 1.5);
  const simulation = calculateSimulation(faturamentoDesejado);

  return (
    <SectionCard title="12. SIMULAÇÃO DE FATURAMENTO DESEJADO" icon={<Calculator className="w-5 h-5" />}>
      <div className="alert-info mb-6">
        <p className="text-sm">Esta simulação é apenas uma projeção e <strong>não salva no banco de dados</strong>.</p>
      </div>

      <div className="mb-6">
        <InputField
          label="Faturamento Mensal Desejado"
          value={faturamentoDesejado}
          onChange={(v) => setFaturamentoDesejado(v as number)}
          prefix="R$"
          step={1000}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-block">
          <p className="stat-label">Faturamento Mensal</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.faturamento_mensal_desejado)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Faturamento Ciclo</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.faturamento_ciclo_desejado)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Investimento Mensal Necessário</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.investimento_mensal_necessario)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Investimento Ciclo Necessário</p>
          <p className="stat-value text-xl">{formatCurrency(simulation.investimento_ciclo_necessario)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/10 border border-accent/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase">Diferença Investimento Mensal</p>
          <p className={`text-2xl font-bold font-mono ${simulation.delta_investimento_mensal >= 0 ? 'text-destructive' : 'text-success'}`}>
            {simulation.delta_investimento_mensal >= 0 ? '+' : ''}{formatCurrency(simulation.delta_investimento_mensal)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase">Diferença Investimento Ciclo</p>
          <p className={`text-2xl font-bold font-mono ${simulation.delta_investimento_ciclo >= 0 ? 'text-destructive' : 'text-success'}`}>
            {simulation.delta_investimento_ciclo >= 0 ? '+' : ''}{formatCurrency(simulation.delta_investimento_ciclo)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase">Peças Necessárias/Mês</p>
          <p className="text-2xl font-bold font-mono text-accent">{formatNumber(simulation.qtd_minima_pecas)}</p>
        </div>
      </div>
    </SectionCard>
  );
}
