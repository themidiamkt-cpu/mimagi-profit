import { SectionCard } from '../SectionCard';
import { FluxoCaixaMensal } from '@/types/compras';
import { formatCurrency } from '@/utils/formatters';
import { TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from 'recharts';

interface Props {
  fluxoCaixa: FluxoCaixaMensal[];
  faturamentoMensal: number;
}

export function FluxoCaixa({ fluxoCaixa, faturamentoMensal }: Props) {
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
        return 'bg-success/10 border-success';
      case 'amarelo':
        return 'bg-warning/10 border-warning';
      case 'vermelho':
        return 'bg-destructive/10 border-destructive';
      default:
        return 'bg-muted';
    }
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
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                fill="hsl(var(--accent))" 
                name="Custo Compras"
              />
              <Bar 
                dataKey="custosFixos" 
                stackId="a"
                fill="hsl(var(--muted-foreground))" 
                name="Custos Fixos"
              />
              <Line 
                type="monotone" 
                dataKey="faturamentoPlanejado" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Faturamento Planejado"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de fluxo */}
      <div className="overflow-x-auto">
        <table className="corporate-table">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="text-right">Custo Compras</th>
              <th className="text-right">Custos Fixos</th>
              <th className="text-right">Total Saídas</th>
              <th className="text-right">Fat. Necessário</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {mesesRelevantes.map((mes) => (
              <tr key={mes.mes} className={mes.custo_compras > 0 ? '' : 'opacity-50'}>
                <td className="font-medium">{mes.mes_display}</td>
                <td className="text-right font-mono">{formatCurrency(mes.custo_compras)}</td>
                <td className="text-right font-mono text-muted-foreground">{formatCurrency(mes.custos_fixos)}</td>
                <td className="text-right font-mono font-semibold">{formatCurrency(mes.total_saidas)}</td>
                <td className="text-right font-mono">{formatCurrency(mes.faturamento_necessario)}</td>
                <td className="text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 border-l-4 ${getStatusColor(mes.status)}`}>
                    {getStatusIcon(mes.status)}
                    <span className="text-xs uppercase">{mes.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mesesRelevantes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma compra cadastrada para visualizar o fluxo de caixa.</p>
        </div>
      )}
    </SectionCard>
  );
}
