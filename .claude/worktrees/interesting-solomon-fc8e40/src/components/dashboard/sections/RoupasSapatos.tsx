import { Shirt } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function RoupasSapatos({ data, calculated, updateField }: Props) {
  const somaCategoria = data.perc_roupas + data.perc_sapatos;
  const isValid = Math.abs(somaCategoria - 100) < 0.01;

  return (
    <SectionCard title="3. ROUPAS X SAPATOS" icon={<Shirt className="w-5 h-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <InputField
          label="% Roupas"
          value={data.perc_roupas}
          onChange={(v) => updateField('perc_roupas', v as number)}
          suffix="%"
          min={0}
          max={100}
        />
        <InputField
          label="% Sapatos"
          value={data.perc_sapatos}
          onChange={(v) => updateField('perc_sapatos', v as number)}
          suffix="%"
          min={0}
          max={100}
        />
      </div>

      {!isValid && (
        <div className="alert-warning mb-4">
          <p className="text-sm">A soma dos percentuais é <strong>{formatPercent(somaCategoria)}</strong>. Deve ser 100%.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="stat-block">
          <p className="stat-label">Investimento Roupas</p>
          <p className="stat-value">{formatCurrency(calculated.investimento_roupas)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Investimento Sapatos</p>
          <p className="stat-value">{formatCurrency(calculated.investimento_sapatos)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Faturamento Roupas</p>
          <p className="stat-value">{formatCurrency(calculated.faturamento_roupas)}</p>
        </div>
        <div className="stat-block">
          <p className="stat-label">Faturamento Sapatos</p>
          <p className="stat-value">{formatCurrency(calculated.faturamento_sapatos)}</p>
        </div>
      </div>
    </SectionCard>
  );
}
