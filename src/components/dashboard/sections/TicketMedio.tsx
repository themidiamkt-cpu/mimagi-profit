import { Receipt } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { InputField } from '../InputField';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatNumber } from '@/utils/formatters';

import { useDashboardContext } from '@/contexts/DashboardContext';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function TicketMedio({ data, calculated, updateField }: Props) {
  const { actualMetrics } = useDashboardContext();
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
            <th className="text-right">Ticket Médio (Meta)</th>
            <th className="text-right">Ticket Médio (Real)</th>
            <th className="text-right">Qtd. Peças (Meta)</th>
            <th className="text-right text-primary font-bold">Qtd. Peças (Real)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">Menina</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_menina)}</td>
            <td className="text-right font-mono font-medium text-primary">{formatCurrency(actualMetrics.menina.ticket_medio)}</td>
            <td className="text-right font-mono">{formatNumber(calculated.qtd_pecas_menina)}</td>
            <td className="text-right font-mono font-bold text-primary">{formatNumber(actualMetrics.menina.qtd_pecas)}</td>
          </tr>
          <tr>
            <td className="font-medium">Menino</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_menino)}</td>
            <td className="text-right font-mono font-medium text-primary">{formatCurrency(actualMetrics.menino.ticket_medio)}</td>
            <td className="text-right font-mono">{formatNumber(calculated.qtd_pecas_menino)}</td>
            <td className="text-right font-mono font-bold text-primary">{formatNumber(actualMetrics.menino.qtd_pecas)}</td>
          </tr>
          <tr>
            <td className="font-medium">Bebê</td>
            <td className="text-right font-mono">{formatCurrency(data.tm_bebe)}</td>
            <td className="text-right font-mono font-medium text-primary">{formatCurrency(actualMetrics.bebe.ticket_medio)}</td>
            <td className="text-right font-mono">{formatNumber(calculated.qtd_pecas_bebe)}</td>
            <td className="text-right font-mono font-bold text-primary">{formatNumber(actualMetrics.bebe.qtd_pecas)}</td>
          </tr>
          <tr>
            <td className="font-medium">Sapatos</td>
            <td className="text-right font-mono">—</td>
            <td className="text-right font-mono font-medium text-primary">{formatCurrency(actualMetrics.sapatos.ticket_medio)}</td>
            <td className="text-right font-mono">—</td>
            <td className="text-right font-mono font-bold text-primary">{formatNumber(actualMetrics.sapatos.qtd_pecas)}</td>
          </tr>
          <tr className="bg-muted/50 border-t-2 border-accent/20">
            <td className="font-medium">TOTAL</td>
            <td className="text-right font-mono">—</td>
            <td className="text-right font-mono font-bold text-accent">{formatCurrency(actualMetrics.total.ticket_medio)}</td>
            <td className="text-right font-mono font-medium">{formatNumber(calculated.qtd_pecas_total)}</td>
            <td className="text-right font-mono font-bold text-accent">{formatNumber(actualMetrics.total.qtd_pecas)}</td>
          </tr>
        </tbody>
      </table>
    </SectionCard>
  );
}
