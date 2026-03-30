import { Receipt } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function TicketMedio({ data, calculated, updateField }: Props) {
  return (
    <SectionCard title="6. TICKET MÉDIO E QUANTIDADE DE PEÇAS" icon={<Receipt className="w-5 h-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <InputField
          label="Ticket Médio Menina"
          value={data.tm_menina}
          onChange={(v) => updateField('tm_menina', v as number)}
          prefix="R$"
          step={5}
        />
        <InputField
          label="Ticket Médio Menino"
          value={data.tm_menino}
          onChange={(v) => updateField('tm_menino', v as number)}
          prefix="R$"
          step={5}
        />
        <InputField
          label="Ticket Médio Bebê"
          value={data.tm_bebe}
          onChange={(v) => updateField('tm_bebe', v as number)}
          prefix="R$"
          step={5}
        />
      </div>

      <table className="corporate-table">
        <thead>
          <tr>
            <th>Público</th>
            <th className="text-right">Ticket Médio</th>
            <th className="text-right">Faturamento Mensal</th>
            <th className="text-right">Qtd. Peças/Mês</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">Menina</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_menina)}</td>
            <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menina)}</td>
            <td className="text-right font-mono font-bold">{formatNumber(calculated.qtd_pecas_menina)}</td>
          </tr>
          <tr>
            <td className="font-medium">Menino</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_menino)}</td>
            <td className="text-right font-mono">{formatCurrency(calculated.faturamento_menino)}</td>
            <td className="text-right font-mono font-bold">{formatNumber(calculated.qtd_pecas_menino)}</td>
          </tr>
          <tr>
            <td className="font-medium">Bebê</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_bebe)}</td>
            <td className="text-right font-mono">{formatCurrency(calculated.faturamento_bebe)}</td>
            <td className="text-right font-mono font-bold">{formatNumber(calculated.qtd_pecas_bebe)}</td>
          </tr>
          <tr className="bg-muted/50">
            <td className="font-bold">TOTAL</td>
            <td className="text-right font-mono">—</td>
            <td className="text-right font-mono font-bold">{formatCurrency(calculated.faturamento_mensal)}</td>
            <td className="text-right font-mono font-bold text-accent">{formatNumber(calculated.qtd_pecas_total)}</td>
          </tr>
        </tbody>
      </table>
    </SectionCard>
  );
}
