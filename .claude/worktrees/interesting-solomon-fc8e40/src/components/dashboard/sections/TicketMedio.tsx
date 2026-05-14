import { Receipt, RefreshCw, ShoppingBag } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { Button } from '@/components/ui/button';
import { PlanejamentoFinanceiro, CalculatedValues } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { useMemo } from 'react';

interface Props {
  data: PlanejamentoFinanceiro;
  calculated: CalculatedValues;
  updateField: <K extends keyof PlanejamentoFinanceiro>(field: K, value: PlanejamentoFinanceiro[K]) => void;
}

export function TicketMedio({ data, calculated, updateField }: Props) {
  const { compras, syncPlanningWithActuals } = useDashboardContext();

  const brandAnalysis = useMemo(() => {
    const brands: Record<string, { total: number; qty: number; ticket: number; perc: number }> = {};
    let totalInvestment = 0;

    compras.forEach(c => {
      const brandName = c.marca || 'Sem Marca';
      if (!brands[brandName]) {
        brands[brandName] = { total: 0, qty: 0, ticket: 0, perc: 0 };
      }
      brands[brandName].total += Number(c.valor_total) || 0;
      brands[brandName].qty += Number(c.qtd_pecas) || 0;
      totalInvestment += Number(c.valor_total) || 0;
    });

    Object.keys(brands).forEach(b => {
      if (brands[b].qty > 0) {
        brands[b].ticket = brands[b].total / brands[b].qty;
      }
      if (totalInvestment > 0) {
        brands[b].perc = (brands[b].total / totalInvestment) * 100;
      }
    });

    return {
      list: Object.entries(brands)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total),
      totalInvestment
    };
  }, [compras]);

  return (
    <SectionCard
      title="6. ANÁLISE DE COMPRAS POR FORNECEDOR/MARCA"
      icon={<ShoppingBag className="w-5 h-5 text-primary" />}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={syncPlanningWithActuals}
          className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sincronizar Metas
        </Button>
      }
    >
      <div className="mb-6 bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Investimento Total Capturado</p>
          <p className="text-2xl font-black text-primary">{formatCurrency(brandAnalysis.totalInvestment)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Total de Peças</p>
          <p className="text-2xl font-black text-primary">
            {formatNumber(brandAnalysis.list.reduce((acc, curr) => acc + curr.qty, 0))}
          </p>
        </div>
      </div>

      <table className="corporate-table">
        <thead>
          <tr>
            <th>Fornecedor / Marca</th>
            <th className="text-right">Valor Total</th>
            <th className="text-right text-primary font-bold">Qtd. Peças</th>
            <th className="text-right">Ticket Médio</th>
            <th className="text-right">% Compra</th>
          </tr>
        </thead>
        <tbody>
          {brandAnalysis.list.length > 0 ? (
            brandAnalysis.list.map((brand) => (
              <tr key={brand.name}>
                <td className="font-bold text-primary">{brand.name}</td>
                <td className="text-right font-mono">{formatCurrency(brand.total)}</td>
                <td className="text-right font-mono font-bold text-primary">{formatNumber(brand.qty)}</td>
                <td className="text-right font-mono italic">{formatCurrency(brand.ticket)}</td>
                <td className="text-right font-mono">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black">
                    {formatPercent(brand.perc)}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-8 text-muted-foreground italic">
                Nenhuma compra importada para este ciclo ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SectionCard>
  );
}
