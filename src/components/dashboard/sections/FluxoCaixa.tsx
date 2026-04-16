import React, { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { formatCurrency } from '@/utils/formatters';
import { TrendingDown, TrendingUp, Minus, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from 'recharts';
import { Compra, FluxoCaixaMensal, ParcelaCalculada } from '@/types/compras';

import { cn } from '@/lib/utils';
interface Props {
  fluxoCaixa: FluxoCaixaMensal[];
  faturamentoMensal: number;
  compras: Compra[];
  calcularParcelas: (compra: Compra) => ParcelaCalculada[];
}

export function FluxoCaixa({ fluxoCaixa, faturamentoMensal, compras, calcularParcelas }: Props) {
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  // Filtrar apenas meses com dados relevantes (com compras ou próximos 12 meses)
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const mesesRelevantes = fluxoCaixa.filter(m => {
    const temCompras = m.custo_compras > 0;
    const diff = (parseInt(m.mes.split('-')[0]) - hoje.getFullYear()) * 12 +
      (parseInt(m.mes.split('-')[1]) - (hoje.getMonth() + 1));
    return temCompras || (diff >= 0 && diff <= 11);
  });

  // Dados para o gráfico
  const chartData = mesesRelevantes.map(m => ({
    mes: m.mes_display.replace('/', '\n'),
    custoCompras: m.custo_compras,
    custosFixos: m.custos_fixos,
    totalSaidas: m.total_saidas,
    faturamentoNecessario: m.faturamento_necessario,
    faturamentoPlanejado: faturamentoMensal,
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verde':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'amarelo':
        return <Minus className="w-4 h-4 text-warning" />;
      case 'vermelho':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verde':
        return 'bg-success/10 border-success text-success';
      case 'amarelo':
        return 'bg-warning/10 border-warning text-warning';
      case 'vermelho':
        return 'bg-destructive/10 border-destructive text-destructive';
      default:
        return 'bg-muted';
    }
  };

  const toggleMonth = (mes: string) => {
    setExpandedMonths(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const getBreakdownForMonth = (mes: string) => {
    const breakdown: Record<string, number> = {};
    compras.forEach(compra => {
      const parcelas = calcularParcelas(compra);
      parcelas.forEach(p => {
        if (p.competencia_mes === mes) {
          if (!breakdown[compra.marca]) breakdown[compra.marca] = 0;
          breakdown[compra.marca] += p.valor;
        }
      });
    });
    return Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  };

  return (
    <SectionCard title="Fluxo de Caixa - Compras" icon={<BarChart3 className="w-5 h-5" />}>
      {/* Legenda de status */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 bg-success" />
          <span>Dentro do planejado (&lt;80%)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 bg-warning" />
          <span>Atenção (80-100%)</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 bg-destructive" />
          <span>Risco de caixa (&gt;100%)</span>
        </div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    custoCompras: 'Custo Compras',
                    custosFixos: 'Custos Fixos',
                    totalSaidas: 'Total Saídas',
                    faturamentoPlanejado: 'Faturamento Planejado',
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0',
                }}
              />
              <Legend />
              <Bar
                dataKey="custoCompras"
                stackId="a"
                fill="#3b82f6"
                name="Custo Compras"
              />
              <Bar
                dataKey="custosFixos"
                stackId="a"
                fill="#94a3b8"
                name="Custos Fixos"
              />
              <Line
                type="monotone"
                dataKey="faturamentoPlanejado"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Faturamento Planejado"
                dot={{ r: 4, fill: '#10b981' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de fluxo */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[900px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border-subtle">
              <th className="w-[4%] py-3 px-4"></th>
              <th className="text-left w-[14%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mês</th>
              <th className="text-right w-[16%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo Compras</th>
              <th className="text-right w-[16%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Custos Fixos</th>
              <th className="text-right w-[16%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Saídas</th>
              <th className="text-right w-[18%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fat. Necessário</th>
              <th className="text-center w-[16%] py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {mesesRelevantes.map((mes) => {
              const isExpanded = expandedMonths.includes(mes.mes);
              const breakdown = isExpanded ? getBreakdownForMonth(mes.mes) : [];

              return (
                <React.Fragment key={mes.mes}>
                  <tr
                    className={cn(
                      "cursor-pointer hover:bg-muted/30 transition-colors",
                      mes.custo_compras > 0 ? '' : 'opacity-50',
                      isExpanded && "bg-muted/50"
                    )}
                    onClick={() => toggleMonth(mes.mes)}
                  >
                    <td className="w-[4%] text-center py-4 px-4 border-b border-border/50">
                      {mes.custo_compras > 0 ? (
                        isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground mx-auto" /> : <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" />
                      ) : null}
                    </td>
                    <td className="w-[14%] py-4 px-4 border-b border-border/50 font-medium whitespace-nowrap">
                      {mes.mes_display}
                    </td>
                    <td className="w-[16%] py-4 px-4 border-b border-border/50 text-right font-mono">
                      {mes.custo_compras > 0 ? formatCurrency(mes.custo_compras) : '-'}
                    </td>
                    <td className="w-[16%] py-4 px-4 border-b border-border/50 text-right font-mono text-muted-foreground">
                      {formatCurrency(mes.custos_fixos)}
                    </td>
                    <td className="w-[16%] py-4 px-4 border-b border-border/50 text-right font-mono font-medium">
                      {formatCurrency(mes.total_saidas)}
                    </td>
                    <td className="w-[18%] py-4 px-4 border-b border-border/50 text-right font-mono">
                      {formatCurrency(mes.faturamento_necessario)}
                    </td>
                    <td className="w-[16%] py-4 px-4 border-b border-border/50 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 border-l-2 text-[10px] font-medium uppercase tracking-wider",
                        getStatusColor(mes.status)
                      )}>
                        {getStatusIcon(mes.status)}
                        {mes.status}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && mes.custo_compras > 0 && (
                    <tr className="bg-muted/10 border-t-0">
                      <td colSpan={7} className="p-0">
                        <div className="px-14 py-4 space-y-3 bg-card/30">
                          <h6 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                            Detalhamento de Compras (Marcas)
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {breakdown.map(([marca, valor]) => (
                              <div key={marca} className="flex flex-col gap-1 p-2 rounded bg-muted/20 border border-border/50">
                                <span className="text-[11px] text-muted-foreground font-medium truncate">{marca}</span>
                                <span className="text-sm font-semibold">{formatCurrency(valor)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {
        mesesRelevantes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma compra cadastrada para visualizar o fluxo de caixa.</p>
          </div>
        )
      }
    </SectionCard>
  );
}
