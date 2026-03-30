import { Users } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { DonutChart } from '../DonutChart';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function DistribuicaoPublico({ data, calculated, updateField }: Props) {
  const somaPublico = data.perc_menina + data.perc_menino + data.perc_bebe;
  const isValid = Math.abs(somaPublico - 100) < 0.01;

  const chartData = [
    { name: 'Menina', value: data.perc_menina, color: 'hsl(330, 60%, 55%)' },
    { name: 'Menino', value: data.perc_menino, color: 'hsl(210, 60%, 45%)' },
    { name: 'Bebê', value: data.perc_bebe, color: 'hsl(45, 80%, 55%)' },
  ];

  return (
    <SectionCard title="2. DISTRIBUIÇÃO POR PÚBLICO" icon={<Users className="w-5 h-5" />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <InputField
              label="% Menina"
              value={data.perc_menina}
              onChange={(v) => updateField('perc_menina', v as number)}
              suffix="%"
              min={0}
              max={100}
            />
            <InputField
              label="% Menino"
              value={data.perc_menino}
              onChange={(v) => updateField('perc_menino', v as number)}
              suffix="%"
              min={0}
              max={100}
            />
            <InputField
              label="% Bebê"
              value={data.perc_bebe}
              onChange={(v) => updateField('perc_bebe', v as number)}
              suffix="%"
              min={0}
              max={100}
            />
          </div>
          
          {!isValid && (
            <div className="alert-warning mb-4">
              <p className="text-sm">A soma dos percentuais é <strong>{formatPercent(somaPublico)}</strong>. Deve ser 100%.</p>
            </div>
          )}

          <table className="corporate-table mt-4">
            <thead>
              <tr>
                <th>Público</th>
                <th className="text-right">Invest. Mensal</th>
                <th className="text-right">Invest. Ciclo</th>
                <th className="text-right">Fat. Mensal</th>
                <th className="text-right">Fat. Ciclo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Menina</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_menina)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_menina * 6)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menina)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menina * 6)}</td>
              </tr>
              <tr>
                <td className="font-medium">Menino</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_menino)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_menino * 6)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menino)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menino * 6)}</td>
              </tr>
              <tr>
                <td className="font-medium">Bebê</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_bebe)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.investimento_bebe * 6)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_bebe)}</td>
                <td className="text-right font-mono">{formatCurrency(calculated.faturamento_bebe * 6)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <DonutChart data={chartData} title="Distribuição por Público" />
        </div>
      </div>
    </SectionCard>
  );
}
